Agent-only local RAG (no cloud APIs)

Overview
- Lightweight, local retrieval over your transcripts with citations and a simple conversational CLI.
- Uses multilingual embeddings for Hebrew-friendly search and Chroma for local persistence.

Layout
- Source transcripts: C:\Coding Projects\EISLAW System\RAG_Pilot\transcripts
- Index store (created on first run): C:\Coding Projects\EISLAW System\rag_local\chroma_legal

Quick Start
1) Install deps (once):
   pip install -r C:\Coding Projects\EISLAW System\rag_local\requirements.txt

2) Build/update index:
   python C:\Coding Projects\EISLAW System\rag_local\build_index.py --src "C:\\Coding Projects\\EISLAW System\\RAG_Pilot\\transcripts" --corpus legal

3) Ask questions (interactive):
   python C:\Coding Projects\EISLAW System\rag_local\query_cli.py --corpus legal

Notes
- Supports TXT and DOCX (text extracted).
- Chunk size/overlap tuned for longer Hebrew paragraphs; adjust in the scripts if needed.
- No external APIs used; all retrieval local. You can still copy/paste answers here to iterate the reasoning.

