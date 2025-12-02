#!/usr/bin/env python3
"""Celery worker runner"""

import subprocess
import sys
import os

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Run Celery worker
    subprocess.run([
        sys.executable, "-m", "celery",
        "-A", "src.workers.celery_app",
        "worker",
        "--loglevel=info",
        "--concurrency=4",
        "-Q", "proofs,settlements,agents,notifications",
    ])

if __name__ == "__main__":
    main()
