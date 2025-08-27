#!/usr/bin/env python3
"""
Test script for document upload
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_workflow():
    print("🧪 Testing DocAI API Workflow")
    print("=" * 40)
    
    # 1. Register user
    print("1️⃣  Registering user...")
    register_data = {
        "email": "testuser@docai.com",
        "password": "secure123"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
    if response.status_code == 200:
        user_data = response.json()
        print(f"✅ User registered: {user_data['email']}")
    else:
        print(f"⚠️  Registration failed (maybe user exists): {response.text}")
    
    # 2. Login
    print("\n2️⃣  Logging in...")
    login_data = {
        "email": "testuser@docai.com",
        "password": "secure123"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        token_data = response.json()
        token = token_data["access_token"]
        print(f"✅ Login successful, token: {token[:20]}...")
    else:
        print(f"❌ Login failed: {response.text}")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Create a test PDF-like file (text file for now)
    print("\n3️⃣  Preparing test document...")
    with open("/home/angel/DocAI/test_document.txt", "rb") as f:
        files = {"file": ("test_doc.txt", f, "text/plain")}
        
        print("📤 Uploading document...")
        response = requests.post(f"{BASE_URL}/documents/upload", files=files, headers=headers)
        
        if response.status_code == 200:
            doc_data = response.json()
            print(f"✅ Document uploaded: {doc_data['title']}")
            print(f"   Status: {doc_data['status']}")
            print(f"   Size: {doc_data['file_size']} bytes")
            document_id = doc_data['id']
        else:
            print(f"❌ Upload failed: {response.text}")
            return
    
    # 4. Check document status
    print("\n4️⃣  Checking document status...")
    for i in range(6):  # Check for 60 seconds
        response = requests.get(f"{BASE_URL}/documents/{document_id}", headers=headers)
        if response.status_code == 200:
            doc_data = response.json()
            status = doc_data['status']
            print(f"   Status: {status}")
            
            if status == "indexed":
                print("✅ Document processed successfully!")
                break
            elif status == "failed":
                print("❌ Document processing failed!")
                break
            else:
                print(f"⏳ Still {status}, waiting...")
                time.sleep(10)
        else:
            print(f"❌ Error checking status: {response.text}")
            break
    
    # 5. List documents
    print("\n5️⃣  Listing user documents...")
    response = requests.get(f"{BASE_URL}/documents/", headers=headers)
    if response.status_code == 200:
        documents = response.json()
        print(f"✅ Found {len(documents)} documents")
        for doc in documents:
            print(f"   - {doc['title']} ({doc['status']})")
    else:
        print(f"❌ Error listing documents: {response.text}")
    
    print("\n🎉 Test workflow completed!")

if __name__ == "__main__":
    test_workflow()