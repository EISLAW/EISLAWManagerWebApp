#!/usr/bin/env python3
"""Final fix for Task Attachments - separate classes from endpoints"""

import re

# Read main.py
with open("main.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove any existing buggy insertions
# Find and remove the endpoint functions that were inserted in the wrong place
patterns_to_remove = [
    r'\n@app\.get\("/tasks/\{task_id\}/files"\).*?raise HTTPException\(500,.*?\)\n',
    r'\n@app\.post\("/tasks/\{task_id\}/emails/attach"\).*?raise HTTPException\(500,.*?\)\n',
    r'\n@app\.post\("/tasks/\{task_id\}/links/add"\).*?raise HTTPException\(500,.*?\)\n',
    r'\n@app\.post\("/tasks/\{task_id\}/folder_link_add"\).*?raise HTTPException\(500,.*?\)\n',
    r'\n@app\.post\("/tasks/\{task_id\}/assets/remove"\).*?raise HTTPException\(500,.*?\)\n',
    r'\n@app\.patch\("/tasks/\{task_id\}/links/update"\).*?raise HTTPException\(500,.*?\)\n',
    r'\n@app\.patch\("/tasks/\{task_id\}/files/\{drive_id\}/title"\).*?raise HTTPException\(500,.*?\)\n',
    r'\n@app\.post\("/tasks/\{task_id\}/files/upload"\).*?raise HTTPException\(500,.*?\)\n',
]

for pattern in patterns_to_remove:
    content = re.sub(pattern, '\n', content, flags=re.DOTALL)

print("✅ Removed any existing endpoint functions")

# 2. Classes are already at the right place (after ContactUpdate)
# Verify they exist
if "class EmailAttachment(BaseModel):" not in content:
    print("⚠️  EmailAttachment class not found - adding it")

    # Find ContactUpdate class
    contact_update_match = re.search(r'(class ContactUpdate\(BaseModel\):.*?)(\n\n@app\.|\n\nclass )', content, re.DOTALL)
    if contact_update_match:
        insert_pos = contact_update_match.end(1)

        classes_code = '''

# ═════════════════════════════════════════════════════════════
# TASK ATTACHMENTS MODELS (Phase 4H - 2025-12-07)
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
    index: int

class FileRename(BaseModel):
    new_title: str

'''
        content = content[:insert_pos] + classes_code + content[insert_pos:]
        print("✅ Added Pydantic model classes")
else:
    print("✅ Pydantic model classes already exist")

# 3. Add endpoint functions AFTER the /airtable/clients_upsert endpoint
# Find the last Phase 4I endpoint
marker = '@app.post("/airtable/clients_upsert")'
if marker not in content:
    print("❌ Could not find /airtable/clients_upsert endpoint")
    exit(1)

# Find end of that function
marker_pos = content.find(marker)
# Find the next @app. endpoint after this function
next_endpoint = content.find("\n\n@app.", marker_pos + len(marker))
if next_endpoint == -1:
    # Find next major section
    next_endpoint = content.find("\n\n# ═", marker_pos + len(marker))

if next_endpoint == -1:
    print("❌ Could not find insertion point")
    exit(1)

# Endpoints code (functions only, no classes)
endpoints_code = '''

# ═════════════════════════════════════════════════════════════
# TASK ATTACHMENTS ENDPOINTS (Phase 4H - 2025-12-07)
# ═════════════════════════════════════════════════════════════

@app.get("/tasks/{task_id}/files")
async def get_task_files(task_id: str):
    """Get task attachments/files"""
    try:
        from backend.db_api_helpers import find_task_by_id
        task = find_task_by_id(task_id)

        if not task:
            raise HTTPException(404, "Task not found")

        attachments = task.get('attachments', [])

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

        if 'attachments' not in task or task['attachments'] is None:
            task['attachments'] = []

        attachments = task['attachments']
        if isinstance(attachments, str):
            import json
            attachments = json.loads(attachments) if attachments else []

        for att in attachments:
            if att.get('kind') == 'email' and att.get('id') == email.id:
                return {"status": "already_attached", "attachment_count": len(attachments)}

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

# Insert endpoints at correct location
content = content[:next_endpoint] + "\n" + endpoints_code + content[next_endpoint:]

# Backup
with open("main.py.backup_final", "w", encoding="utf-8") as f:
    with open("main.py", "r", encoding="utf-8") as orig:
        f.write(orig.read())

# Write
with open("main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Task Attachments implementation complete")
print("   - Pydantic models: after ContactUpdate")
print("   - Endpoint functions: after /airtable/clients_upsert")
print("📝 Backup saved as main.py.backup_final")
