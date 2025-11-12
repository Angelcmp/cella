#!/usr/bin/env python3
import os
import shutil
from datetime import datetime

import sys
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "apps", "api"))

from database_simple import SessionLocal, User, Document, DocumentChunk
from auth_simple import get_password_hash

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
UPLOAD_DIR = os.path.abspath(UPLOAD_DIR)
os.makedirs(UPLOAD_DIR, exist_ok=True)

SAMPLES = [
    ("test_document.txt", "Contrato de ejemplo.txt"),
    ("test_document_ejemplo.txt", "Manual de usuario.txt"),
]


def main():
    db = SessionLocal()
    try:
        # Create demo users
        users = []
        for i in range(1, 3):
            email = f"demo{i}@docai.local"
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(
                    email=email,
                    hashed_password=get_password_hash("demo1234"),
                    plan="demo",
                    credits_remaining=100,
                    full_name=f"Usuario Demo {i}",
                )
                db.add(u)
                db.commit()
                db.refresh(u)
            users.append(u)

        # Seed documents for first user
        user = users[0]
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        for src_name, title in SAMPLES:
            src_path = os.path.join(repo_root, src_name)
            if not os.path.exists(src_path):
                continue
            # Copy to uploads
            dst_name = f"{int(datetime.utcnow().timestamp())}_{src_name}"
            dst_path = os.path.join(UPLOAD_DIR, dst_name)
            shutil.copyfile(src_path, dst_path)
            size = os.path.getsize(dst_path)

            doc = Document(
                user_id=user.id,
                title=title,
                filename=dst_name,
                storage_url=dst_path,
                file_size=size,
                status="indexed",
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            # Add a single chunk
            text = open(dst_path, "r", encoding="utf-8", errors="ignore").read()[:2000]
            chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=0,
                text=text,
                tokens=len(text.split()),
                page_start=1,
                page_end=1,
            )
            db.add(chunk)
            db.commit()

        print("Demo seed completed.")
    finally:
        db.close()


if __name__ == "__main__":
    main()

