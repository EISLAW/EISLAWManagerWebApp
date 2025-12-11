#!/usr/bin/env python3
"""Fix Task Attachments endpoints insertion point"""

import sys

# Read main.py
with open("main.py", "r", encoding="utf-8") as f:
    content = f.read()

# Check if the buggy version exists
if "class EmailAttachment(BaseModel):" in content:
    # Find where it was inserted (around line 994)
    buggy_start = content.find("\n# ═════════════════════════════════════════════════════════════\n# TASK ATTACHMENTS ENDPOINTS")

    if buggy_start > 0:
        # Find the end of the buggy insertion (before the next major section)
        # Look for the next @app. endpoint or major section marker after the buggy code
        search_from = buggy_start + 100
        # Find closing of upload_file_to_task function
        buggy_end = content.find("\n\n@app.", search_from)

        if buggy_end > buggy_start:
            # Remove the buggy section
            content = content[:buggy_start] + content[buggy_end:]
            print("✅ Removed buggy insertion from wrong location")
        else:
            print("⚠️  Could not find end of buggy section")
            sys.exit(1)
    else:
        print("⚠️  Could not find buggy section start")
        sys.exit(1)
else:
    print("⚠️  Buggy code not found - might be already fixed")
    sys.exit(0)

# Now insert in the correct location - after existing Pydantic models
# Find ContactUpdate class (last existing model)
marker = "class ContactUpdate(BaseModel):"
if marker not in content:
    print("❌ Could not find ContactUpdate class")
    sys.exit(1)

marker_pos = content.find(marker)
# Find the end of ContactUpdate class definition (next @app or class)
next_section = content.find("\n\n@app.", marker_pos)
if next_section == -1:
    next_section = content.find("\n\nclass ", marker_pos + len(marker))

if next_section == -1:
    print("❌ Could not find insertion point after ContactUpdate")
    sys.exit(1)

# Endpoints code (same as before)
endpoints_code = '''

# ═════════════════════════════════════════════════════════════
# TASK ATTACHMENTS ENDPOINTS (Phase 4H - 2025-12-07)
# ═════════════════════════════════════════════════════════════

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

# Insert at correct location
new_content = content[:next_section] + "\n" + endpoints_code + content[next_section:]

# Backup
with open("main.py.backup_task_attach2", "w", encoding="utf-8") as f:
    f.write(content)

# Write
with open("main.py", "w", encoding="utf-8") as f:
    f.write(new_content)

print("✅ Task Attachments endpoints fixed and inserted at correct location")
print("   - Removed from wrong location (before pydantic import)")
print("   - Inserted after ContactUpdate class (after pydantic import)")
print("📝 Backup saved as main.py.backup_task_attach2")
