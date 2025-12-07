#!/usr/bin/env python3
"""Final insertion of Phase 4I AI tools"""

# Read the file
with open("ai_studio_tools.py", "r", encoding="utf-8") as f:
    content = f.read()

# Check if already done
if "def execute_update_client" in content:
    print("⚠️  Tools already inserted")
    exit(0)

# Read the tools to insert
with open("phase4i_tools_insert.txt", "r", encoding="utf-8") as f:
    tools_code = f.read()

# Find where AVAILABLE_TOOLS is defined
marker = "AVAILABLE_TOOLS = ["
if marker in content:
    # Insert tools BEFORE AVAILABLE_TOOLS
    parts = content.split(marker)
    new_content = parts[0] + tools_code + "\n\n" + marker + parts[1]

    # Also add to tool_executors if it exists
    exec_marker = "tool_executors = {"
    if exec_marker in new_content:
        dispatcher = '''
        "update_client": execute_update_client,
        "create_client": execute_create_client,
        "get_client_contacts": execute_get_client_contacts,
        "add_contact": execute_add_contact,
        "sync_client_to_airtable": execute_sync_client_to_airtable,
'''
        exec_parts = new_content.split(exec_marker)
        new_content = exec_parts[0] + exec_marker + dispatcher + exec_parts[1]

    # Write back
    with open("ai_studio_tools.py", "w", encoding="utf-8") as f:
        f.write(new_content)

    print("✅ Phase 4I tools and executors added successfully!")
else:
    print("❌ Could not find AVAILABLE_TOOLS marker")
