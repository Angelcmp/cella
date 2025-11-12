#!/usr/bin/env python3
"""
Offline RAG evaluation harness for DocAI.

Two modes:
1) Unlabeled: Given document_id and a list of questions, runs RAG and flags
   potential hallucinations by checking answer support against retrieved chunks.
2) Labeled: Given a JSONL file with fields {document_id, question, expected},
   computes simple token-level precision/recall/F1 and support ratios.

Outputs a JSON report with per-question diagnostics and aggregate metrics.
"""

import argparse
import json
import os
import re
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv  # type: ignore

# Ensure env is loaded so providers work
load_dotenv()

# Local imports from API app
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'apps', 'api'))

from database_simple import get_db, DocumentChunk  # type: ignore
from rag_system import RAGSystem  # type: ignore
from sqlalchemy.orm import Session  # type: ignore


def _normalize_text(t: str) -> List[str]:
    t = t.lower()
    t = re.sub(r"[^\p{L}\p{N}\s]", " ", t, flags=re.UNICODE)
    t = re.sub(r"\s+", " ", t).strip()
    return t.split()


def _token_f1(pred: str, ref: str) -> Dict[str, float]:
    p = _normalize_text(pred)
    r = _normalize_text(ref)
    if not p and not r:
        return {"precision": 1.0, "recall": 1.0, "f1": 1.0}
    if not p or not r:
        return {"precision": 0.0, "recall": 0.0, "f1": 0.0}
    from collections import Counter
    cp = Counter(p)
    cr = Counter(r)
    overlap = sum(min(cp[w], cr[w]) for w in cp)
    precision = overlap / max(1, len(p))
    recall = overlap / max(1, len(r))
    f1 = 0.0 if precision + recall == 0 else 2 * precision * recall / (precision + recall)
    return {"precision": precision, "recall": recall, "f1": f1}


def _sentences(text: str) -> List[str]:
    # Simple sentence split
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s for s in parts if s.strip()]


def support_ratio(answer: str, context: str, min_overlap: float = 0.2) -> Dict[str, Any]:
    """Compute fraction of answer sentences supported by context via token overlap.
    min_overlap is the minimum fraction of tokens in a sentence that must appear in context.
    """
    ctx_tokens = set(_normalize_text(context))
    sents = _sentences(answer)
    if not sents:
        return {"supported": 0, "total": 0, "ratio": 1.0}
    supported = 0
    per_sent = []
    for s in sents:
        stoks = _normalize_text(s)
        if not stoks:
            per_sent.append({"sentence": s, "supported": True, "overlap": 1.0})
            supported += 1
            continue
        overlap = sum(1 for w in stoks if w in ctx_tokens) / len(stoks)
        ok = overlap >= min_overlap
        if ok:
            supported += 1
        per_sent.append({"sentence": s, "supported": ok, "overlap": round(overlap, 3)})
    ratio = supported / len(sents)
    return {"supported": supported, "total": len(sents), "ratio": round(ratio, 3), "details": per_sent}


@dataclass
class EvalItem:
    document_id: str
    question: str
    expected: Optional[str] = None


def load_eval_items(path: Optional[str], document_id: Optional[str], questions: Optional[List[str]]) -> List[EvalItem]:
    items: List[EvalItem] = []
    if path:
        with open(path, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                data = json.loads(line)
                items.append(EvalItem(document_id=data["document_id"], question=data["question"], expected=data.get("expected")))
        return items
    if document_id and questions:
        for q in questions:
            items.append(EvalItem(document_id=document_id, question=q))
        return items
    raise SystemExit("Provide either --jsonl or --document-id with --question")


def get_context_text(db: Session, document_id: str) -> str:
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).order_by(DocumentChunk.chunk_index).all()
    return "\n\n".join((c.text or "") for c in chunks)


def main():
    parser = argparse.ArgumentParser(description="Evaluate RAG answers for DocAI")
    parser.add_argument("--jsonl", help="Path to JSONL with {document_id, question, expected}")
    parser.add_argument("--document-id", help="Document ID (if no JSONL)")
    parser.add_argument("--question", action='append', help="Question(s) to evaluate (repeatable)")
    parser.add_argument("--out", default="eval_report.json", help="Output JSON file")
    args = parser.parse_args()

    items = load_eval_items(args.jsonl, args.document_id, args.question)

    rag = RAGSystem()
    db_gen = get_db()
    db = next(db_gen)
    try:
        report: Dict[str, Any] = {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "count": len(items),
            "results": [],
            "aggregates": {}
        }
        f1s: List[float] = []
        ratios: List[float] = []

        for it in items:
            # Run full RAG answer
            result = rag.chat_with_document(db=db, document_id=it.document_id, document_title="", user_query=it.question)
            answer = result.get("response", "")
            citations = result.get("citations", [])
            context = get_context_text(db, it.document_id)
            support = support_ratio(answer, context)

            item_out: Dict[str, Any] = {
                "document_id": it.document_id,
                "question": it.question,
                "answer": answer,
                "citations": citations,
                "support": support,
            }
            ratios.append(support["ratio"])  # type: ignore

            if it.expected:
                scores = _token_f1(answer, it.expected)
                item_out["scores"] = scores
                f1s.append(scores["f1"])  # type: ignore

            report["results"].append(item_out)

        if f1s:
            report["aggregates"]["avg_f1"] = sum(f1s) / len(f1s)
        report["aggregates"]["avg_support_ratio"] = sum(ratios) / len(ratios) if ratios else None

        with open(args.out, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"Saved report to {args.out}")
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass


if __name__ == "__main__":
    main()

