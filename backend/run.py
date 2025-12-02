#!/usr/bin/env python3
"""Development server runner with hot-reload"""

import subprocess
import sys
import os

def main():
    # Ensure we're in the right directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Run uvicorn with hot-reload
    subprocess.run([
        sys.executable, "-m", "uvicorn",
        "src.main:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--reload",
        "--reload-dir", "src",
        "--log-level", "info",
    ])

if __name__ == "__main__":
    main()
