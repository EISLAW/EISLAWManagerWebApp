#!/usr/bin/env python3
"""Add missing dispatcher functions to ai_studio_tools.py"""

import sys

# Read current ai_studio_tools.py
with open("ai_studio_tools.py", "r", encoding="utf-8") as f:
    content = f.read()

# Check if dispatchers already exist
if "def execute_tool(" in content and "def get_tools_for_llm(" in content:
    print("⚠️  Dispatcher functions already exist")
    sys.exit(0)

# Dispatcher code to add
dispatcher_code = '''

# ─────────────────────────────────────────────────────────────
# Tool Dispatcher Functions (for ai_studio.py integration)
# ─────────────────────────────────────────────────────────────

def get_tools_for_llm() -> List[Dict[str, Any]]:
    """
    Return the list of available tools in OpenAI function calling format.
    Used by ai_studio.py to provide tools to the LLM.
    """
    return AVAILABLE_TOOLS


def execute_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main dispatcher function that routes tool calls to their executor functions.

    Args:
        tool_name: Name of the tool to execute
        arguments: Dictionary of arguments to pass to the tool

    Returns:
        Dictionary with execution results
    """
    # Map tool names to executor functions
    tool_executors = {
        # Phase 4I Client Management Tools
        "update_client": execute_update_client,
        "create_client": execute_create_client,
        "get_client_contacts": execute_get_client_contacts,
        "add_contact": execute_add_contact,
        "sync_client_to_airtable": execute_sync_client_to_airtable,

        # Original AI Studio Tools
        "search_clients": execute_search_clients,
        "get_client_details": execute_get_client_details,
        "search_tasks": execute_search_tasks,
        "create_task": execute_create_task,
        "update_task_status": execute_update_task_status,
        "get_system_summary": execute_get_system_summary,
    }

    # Check if tool exists
    if tool_name not in tool_executors:
        return {
            "success": False,
            "error": f"Unknown tool: {tool_name}",
            "available_tools": list(tool_executors.keys())
        }

    # Get the executor function
    executor = tool_executors[tool_name]

    # Execute the tool with provided arguments
    try:
        result = executor(**arguments)
        return result
    except TypeError as e:
        # Handle incorrect arguments
        return {
            "success": False,
            "error": f"Invalid arguments for {tool_name}: {str(e)}",
            "arguments_provided": arguments
        }
    except Exception as e:
        # Handle execution errors
        return {
            "success": False,
            "error": f"Tool execution failed: {str(e)}",
            "tool": tool_name
        }
'''

# Find where to insert - after execute_get_system_summary, before the duplicate PHASE4I section
marker = "# ─────────────────────────────────────────────────────────────\n# Main Tool Executor\n# ─────────────────────────────────────────────────────────────"

if marker in content:
    # Insert dispatchers in place of the empty section
    parts = content.split(marker)
    new_content = parts[0] + dispatcher_code

    # Remove the duplicate PHASE4I section at the end if it exists
    if len(parts) > 1 and "# PHASE 4I" in parts[1]:
        # Just add a newline at the end
        new_content += "\n"
    else:
        # Keep everything after marker if no duplicate
        new_content += parts[1]
else:
    # Append at the end if marker not found
    new_content = content + dispatcher_code

# Backup original
with open("ai_studio_tools.py.backup2", "w", encoding="utf-8") as f:
    f.write(content)

# Write modified version
with open("ai_studio_tools.py", "w", encoding="utf-8") as f:
    f.write(new_content)

print("✅ Added dispatcher functions to ai_studio_tools.py")
print("   - get_tools_for_llm()")
print("   - execute_tool()")
print("📝 Backup saved as ai_studio_tools.py.backup2")
print("")
print("Added 11 tools to dispatcher:")
print("  Phase 4I: update_client, create_client, get_client_contacts, add_contact, sync_client_to_airtable")
print("  Original: search_clients, get_client_details, search_tasks, create_task, update_task_status, get_system_summary")
