"""Follow-up suggestion parsing (no LLM calls)."""

from __future__ import annotations

from routers.chat import _parse_suggestions


def test_parse_suggestions_json_array():
    assert _parse_suggestions('["a", "b", "c", "d"]') == ["a", "b", "c"]


def test_parse_suggestions_code_fence():
    raw = '```json\n["p1", "p2", "p3"]\n```'
    assert _parse_suggestions(raw) == ["p1", "p2", "p3"]


def test_parse_suggestions_list_fallback():
    raw = "- ¿Cómo sigue?\n- Otra pregunta\n- Y una más"
    assert _parse_suggestions(raw) == ["¿Cómo sigue?", "Otra pregunta", "Y una más"]


def test_parse_suggestions_empty():
    assert _parse_suggestions("") == []
    assert _parse_suggestions("no hay preguntas") == []
