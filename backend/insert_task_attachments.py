#!/usr/bin/env python3
"""Insert Task Attachments endpoints into main.py"""

import sys

# Read main.py
with open("main.py", "r", encoding="utf-8") as f:
    content = f.read()

# Check if already inserted
if "/tasks/{task_id}/files" in content and "emails/attach" in content:
    print("⚠️  Task Attachments endpoints already exist")
    sys.exit(0)

# New endpoints code
endpoints_code = '''

# ═════════════════════════════════════════════════════════════
# TASK ATTACHMENTS ENDPOINTS (Phase 4H - 2025-12-07)
# ═════════════════════════════════════════════════════════════

from datetime import datetime

class EmailAttachment(BaseModel):
    id: str
    subject: str = ""
    from_addr: str = Field("", alias="from")
    received: str = ""
    has_attachments: bool = False
    attachments_count: int = 0
    preview: str = ""
    client_name: str = ""
    task_title: str = ""

class LinkAdd(BaseModel):
    url: str
    user_title: str = ""

class LinkUpdate(BaseModel):
    url: str = None
    user_title: str = None

class FolderLinkAdd(BaseModel):
    local_path: str

class AssetRemove(BaseModel):
    index: int  # Index in attachments array

class FileRename(BaseModel):
    new_title: str


@app.get("/tasks/{task_id}/files")
async def get_task_files(task_id: str):
    """Get task attachments/files"""
    try:
        from backend.db_api_helpers import find_task_by_id
        task = find_task_by_id(task_id)

        if not task:
            raise HTTPException(404, "Task not found")

        attachments = task.get('attachments', [])

        # Format for frontend
        files = []
        for att in attachments:
            file_entry = {
                "kind": att.get("kind", "file"),
                "drive_id": att.get("drive_id"),
                "web_url": att.get("web_url"),
                "local_path": att.get("local_path"),
                "source_name": att.get("source_name"),
                "user_title": att.get("user_title"),
            }

            # Add email metadata if email attachment
            if att.get("kind") == "email":
                file_entry["email_meta"] = {
                    "id": att.get("id"),
                    "subject": att.get("subject"),
                    "from": att.get("from"),
                    "received": att.get("received"),
                    "has_attachments": att.get("has_attachments", False),
                    "attachments_count": att.get("attachments_count", 0),
                }

            files.append(file_entry)

        return {
            "files": files,
            "folder": {"id": None, "web_url": None},
            "primary_output_drive_id": None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to get task files: {str(e)}")


@app.post("/tasks/{task_id}/emails/attach")
async def attach_email_to_task(task_id: str, email: EmailAttachment):
    """Attach email to task"""
    try:
        from backend.db_api_helpers import find_task_by_id, update_task_in_sqlite

        task = find_task_by_id(task_id)
        if not task:
            raise HTTPException(404, "Task not found")

        # Initialize attachments if needed
        if 'attachments' not in task or task['attachments'] is None:
            task['attachments'] = []

        # Parse if stored as JSON string
        attachments = task['attachments']
        if isinstance(attachments, str):
            import json
            attachments = json.loads(attachments) if attachments else []

        # Check if email already attached
        for att in attachments:
            if att.get('kind') == 'email' and att.get('id') == email.id:
                return {"status": "already_attached", "attachment_count": len(attachments)}

        # Add email attachment
        attachments.append({
            "kind": "email",
            "id": email.id,
            "subject": email.subject,
            "from": email.from_addr,
            "received": email.received,
            "has_attachments": email.has_attachments,
            "attachments_count": email.attachments_count,
            "client_name": email.client_name,
            "task_title": email.task_title,
            "attached_at": datetime.utcnow().isoformat() + 'Z'
        })

        update_task_in_sqlite(task_id, {"attachments": json.dumps(attachments)})

        return {"status": "attached", "attachment_count": len(attachments)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to attach email: {str(e)}")


@app.post("/tasks/{task_id}/links/add")
async def add_link_to_task(task_id: str, link: LinkAdd):
    """Add link to task"""
    try:
        from backend.db_api_helpers import find_task_by_id, update_task_in_sqlite

        task = find_task_by_id(task_id)
        if not task:
            raise HTTPException(404, "Task not found")

        attachments = task.get('attachments', [])
        if isinstance(attachments, str):
            import json
            attachments = json.loads(attachments) if attachments else []

        attachments.append({
            "kind": "link",
            "web_url": link.url,
            "user_title": link.user_title
        })

        update_task_in_sqlite(task_id, {"attachments": json.dumps(attachments)})
        return {"status": "added", "attachment_count": len(attachments)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to add link: {str(e)}")


@app.post("/tasks/{task_id}/folder_link_add")
async def add_folder_link_to_task(task_id: str, folder: FolderLinkAdd):
    """Add folder link to task"""
    try:
        from backend.db_api_helpers import find_task_by_id, update_task_in_sqlite

        task = find_task_by_id(task_id)
        if not task:
            raise HTTPException(404, "Task not found")

        attachments = task.get('attachments', [])
        if isinstance(attachments, str):
            import json
            attachments = json.loads(attachments) if attachments else []

        attachments.append({
            "kind": "folder",
            "local_path": folder.local_path
        })

        update_task_in_sqlite(task_id, {"attachments": json.dumps(attachments)})
        return {"status": "added", "attachment_count": len(attachments)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to add folder link: {str(e)}")


@app.post("/tasks/{task_id}/assets/remove")
async def remove_asset_from_task(task_id: str, asset: AssetRemove):
    """Remove attachment from task"""
    try:
        from backend.db_api_helpers import find_task_by_id, update_task_in_sqlite

        task = find_task_by_id(task_id)
        if not task:
            raise HTTPException(404, "Task not found")

        attachments = task.get('attachments', [])
        if isinstance(attachments, str):
            import json
            attachments = json.loads(attachments) if attachments else []

        if 0 <= asset.index < len(attachments):
            attachments.pop(asset.index)
            update_task_in_sqlite(task_id, {"attachments": json.dumps(attachments)})
            return {"status": "removed", "attachment_count": len(attachments)}
        else:
            raise HTTPException(400, "Invalid attachment index")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to remove asset: {str(e)}")


@app.patch("/tasks/{task_id}/links/update")
async def update_link_in_task(task_id: str, link_update: LinkUpdate):
    """Update link attachment"""
    try:
        from backend.db_api_helpers import find_task_by_id, update_task_in_sqlite

        task = find_task_by_id(task_id)
        if not task:
            raise HTTPException(404, "Task not found")

        attachments = task.get('attachments', [])
        if isinstance(attachments, str):
            import json
            attachments = json.loads(attachments) if attachments else []

        # Find first link attachment and update
        for att in attachments:
            if att.get('kind') == 'link':
                if link_update.url:
                    att['web_url'] = link_update.url
                if link_update.user_title is not None:
                    att['user_title'] = link_update.user_title
                break

        update_task_in_sqlite(task_id, {"attachments": json.dumps(attachments)})
        return {"status": "updated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to update link: {str(e)}")


@app.patch("/tasks/{task_id}/files/{drive_id}/title")
async def rename_file_in_task(task_id: str, drive_id: str, rename: FileRename):
    """Rename file attachment"""
    try:
        from backend.db_api_helpers import find_task_by_id, update_task_in_sqlite

        task = find_task_by_id(task_id)
        if not task:
            raise HTTPException(404, "Task not found")

        attachments = task.get('attachments', [])
        if isinstance(attachments, str):
            import json
            attachments = json.loads(attachments) if attachments else []

        # Find file with matching drive_id
        for att in attachments:
            if att.get('kind') == 'file' and att.get('drive_id') == drive_id:
                att['user_title'] = rename.new_title
                break

        update_task_in_sqlite(task_id, {"attachments": json.dumps(attachments)})
        return {"status": "renamed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to rename file: {str(e)}")


@app.post("/tasks/{task_id}/files/upload")
async def upload_file_to_task(task_id: str, file: UploadFile = File(...)):
    """Upload file to task (stub - requires SharePoint integration)"""
    try:
        from backend.db_api_helpers import find_task_by_id

        task = find_task_by_id(task_id)
        if not task:
            raise HTTPException(404, "Task not found")

        # TODO: Implement SharePoint upload
        # For now, return stub response
        return {
            "status": "not_implemented",
            "message": "File upload requires SharePoint integration",
            "filename": file.filename
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to upload file: {str(e)}")
'''

# Find insertion point - after existing task endpoints
marker = "@app.post(\"/api/tasks/import\")"
if marker in content:
    # Find the end of that function
    marker_pos = content.find(marker)
    # Find the next @app. or # === marker after this function
    next_marker_pos = content.find("\n\n@app.", marker_pos + len(marker))
    if next_marker_pos == -1:
        next_marker_pos = content.find("\n\n# ═", marker_pos + len(marker))

    if next_marker_pos > 0:
        # Insert before next endpoint
        new_content = content[:next_marker_pos] + "\n" + endpoints_code + "\n" + content[next_marker_pos:]
    else:
        # Append at end
        new_content = content + "\n" + endpoints_code
else:
    # Fallback: append at end
    new_content = content + "\n" + endpoints_code

# Check if UploadFile is imported
if "from fastapi import" in new_content and "UploadFile" not in new_content:
    # Add UploadFile and File to imports
    import_line = "from fastapi import"
    if import_line in new_content:
        # Find the import line
        import_start = new_content.find(import_line)
        import_end = new_content.find("\n", import_start)
        import_section = new_content[import_start:import_end]

        # Add UploadFile, File if not present
        additions = []
        if "UploadFile" not in import_section:
            additions.append("UploadFile")
        if "File" not in import_section and "UploadFile" not in import_section:
            additions.append("File")

        if additions:
            # Insert before closing of import
            new_import = import_section.rstrip() + ", " + ", ".join(additions)
            new_content = new_content.replace(import_section, new_import)

# Backup original
with open("main.py.backup_task_attach", "w", encoding="utf-8") as f:
    f.write(content)

# Write modified version
with open("main.py", "w", encoding="utf-8") as f:
    f.write(new_content)

print("✅ Task Attachments endpoints added to main.py")
print("📝 Backup saved as main.py.backup_task_attach")
print("")
print("Added 8 endpoints:")
print("  1. GET /tasks/{id}/files - List attachments")
print("  2. POST /tasks/{id}/emails/attach - Attach email (CEO bug fix)")
print("  3. POST /tasks/{id}/links/add - Add link")
print("  4. POST /tasks/{id}/folder_link_add - Add folder")
print("  5. POST /tasks/{id}/assets/remove - Remove attachment")
print("  6. PATCH /tasks/{id}/links/update - Update link")
print("  7. PATCH /tasks/{id}/files/{drive_id}/title - Rename file")
print("  8. POST /tasks/{id}/files/upload - Upload file (stub)")
