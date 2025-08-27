#!/usr/bin/env python3
"""
Development script to test the DocAI API
"""
import os
import sys
import subprocess
import time
import signal
from threading import Thread

# Add API path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'apps', 'api'))

def run_api():
    """Run the API server"""
    print("🚀 Starting DocAI API server...")
    os.chdir("apps/api")
    subprocess.run([sys.executable, "main.py"])

def run_worker():
    """Run the worker"""
    print("🔧 Starting DocAI Worker...")
    time.sleep(2)  # Give API time to start
    subprocess.run([sys.executable, "apps/worker/worker.py"])

def main():
    """Main development runner"""
    print("🎯 DocAI Development Environment")
    print("================================")
    
    try:
        # Start API in a thread
        api_thread = Thread(target=run_api)
        api_thread.daemon = True
        api_thread.start()
        
        # Wait a moment for API to start
        time.sleep(3)
        
        print("📋 API Endpoints available:")
        print("   - Health: http://localhost:8000/health")
        print("   - Docs: http://localhost:8000/docs")
        print("   - Auth: http://localhost:8000/auth/")
        print("   - Documents: http://localhost:8000/documents/")
        print()
        
        # Start worker
        run_worker()
        
    except KeyboardInterrupt:
        print("\n⭐ Shutting down development environment...")

if __name__ == "__main__":
    main()