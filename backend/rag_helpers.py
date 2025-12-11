"""
RAG Helper utilities
Extracted from main.py to support routers/rag.py
"""
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
TRANSCRIPTS_DIR = BASE_DIR / "Transcripts"
INBOX_DIR = TRANSCRIPTS_DIR / "Inbox"
LIBRARY_DIR = TRANSCRIPTS_DIR / "Library"
INDEX_PATH = TRANSCRIPTS_DIR / "index.json"


def ensure_dirs():
    """Ensure all RAG directories exist."""
    INBOX_DIR.mkdir(parents=True, exist_ok=True)
    TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    LIBRARY_DIR.mkdir(parents=True, exist_ok=True)


def load_index():
    """Load the RAG index from JSON file."""
    if not INDEX_PATH.exists():
        return []
    try:
        return json.loads(INDEX_PATH.read_text("utf-8"))
    except Exception:
        return []


def save_index(items):
    """Save items to the RAG index JSON file."""
    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
