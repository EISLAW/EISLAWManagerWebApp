#!/usr/bin/env python3
"""
Patch script to add missing Graph token and email functions to main.py
Run this on the VM: python3 email_fix_patch_v2.py
"""

# The missing token function to add (goes after get_graph_credentials)
TOKEN_FUNCTION = '''

def get_graph_access_token():
    """Get an access token for Microsoft Graph API using MSAL."""
    creds = get_graph_credentials()
    if not all([creds.get("client_id"), creds.get("client_secret"), creds.get("tenant_id")]):
        raise HTTPException(status_code=500, detail="Microsoft Graph credentials not configured")

    authority = f"https://login.microsoftonline.com/{creds['tenant_id']}"
    app = msal.ConfidentialClientApplication(
        creds["client_id"],
        authority=authority,
        client_credential=creds["client_secret"],
    )

    # Request token for Microsoft Graph
    result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])

    if "access_token" not in result:
        error = result.get("error_description", result.get("error", "Unknown error"))
        raise HTTPException(status_code=500, detail=f"Failed to get Graph token: {error}")

    return result["access_token"]

'''

def patch_main_py():
    """Add the missing token function to main.py"""
    main_py_path = "/home/azureuser/EISLAWManagerWebApp/backend/main.py"

    # Read current file
    with open(main_py_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if function already exists
    if 'def get_graph_access_token' in content:
        print("get_graph_access_token already exists in main.py")
        return False

    # Find the location to insert - after get_airtable_config function
    # Look for the comment line that comes after get_airtable_config
    insert_marker = '# Local Client Registry'

    if insert_marker not in content:
        # Try alternative marker
        insert_marker = 'def get_clients_store_path'
        if insert_marker not in content:
            print(f"Could not find insertion point in main.py")
            return False

    # Insert the token function before the marker
    new_content = content.replace(insert_marker, TOKEN_FUNCTION + "\n" + insert_marker)

    # Backup and write
    backup_path = main_py_path + ".backup-token-fix"
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Backup created: {backup_path}")

    with open(main_py_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Patched {main_py_path}")

    return True


if __name__ == "__main__":
    success = patch_main_py()
    if success:
        print("\n✅ Token function patch applied successfully!")
        print("Restart the API container: /usr/local/bin/docker-compose-v2 restart api")
    else:
        print("\n❌ Patch failed or not needed")
