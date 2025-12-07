#!/usr/bin/env python3
"""Fix the ingest_transcript_sqlite call to use model_used instead of note."""

with open("/home/azureuser/EISLAWManagerWebApp/backend/main.py", "r") as f:
    content = f.read()

old_call = '''    # Store in SQLite
    result = rag_sqlite.ingest_transcript_sqlite(
        file_hash=hash,
        filename=safe_name,
        file_path=str(target_path),
        content=content_text,
        segments=segments,
        client=client,
        domain=domain,
        status=status,
        note=note
    )'''

new_call = '''    # Store in SQLite
    result = rag_sqlite.ingest_transcript_sqlite(
        file_hash=hash,
        filename=safe_name,
        file_path=str(target_path),
        content=content_text,
        segments=segments,
        client=client,
        domain=domain,
        model_used=model or os.environ.get("GEMINI_MODEL", "gemini-1.5-flash"),
        status=status
    )'''

if old_call in content:
    content = content.replace(old_call, new_call)
    print("Updated ingest_transcript_sqlite call")
else:
    print("Could not find exact match")

# Also remove the now-unused 'note' variable assignment line that references a function
old_note_assignment = '''        note = f"Transcribed with {model or os.environ.get('GEMINI_MODEL', 'gemini-1.5-flash')}"'''
new_note_assignment = '''        # note variable removed - using model_used directly'''

if old_note_assignment in content:
    content = content.replace(old_note_assignment, new_note_assignment)
    print("Updated note assignment")

with open("/home/azureuser/EISLAWManagerWebApp/backend/main.py", "w") as f:
    f.write(content)

print("Done")
