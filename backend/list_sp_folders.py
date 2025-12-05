"""List SharePoint folder structure"""
import asyncio
import httpx
import msal
import json
import os

async def main():
    # Load secrets
    secrets = None
    for p in ["/app/secrets.local.json", "secrets.local.json", "secrets.json"]:
        if os.path.exists(p):
            with open(p) as f:
                secrets = json.load(f)
            break

    if not secrets:
        secrets_path = os.environ.get("SECRETS_PATH", "/app/secrets.local.json")
        if os.path.exists(secrets_path):
            with open(secrets_path) as f:
                secrets = json.load(f)
        else:
            print("No secrets file found")
            return

    graph = secrets.get("microsoft_graph", {})
    client_id = graph.get("client_id")
    client_secret = graph.get("client_secret")
    tenant_id = graph.get("tenant_id")

    if not all([client_id, client_secret, tenant_id]):
        print("Missing Graph credentials")
        return

    # Get token
    app = msal.ConfidentialClientApplication(
        client_id,
        authority=f"https://login.microsoftonline.com/{tenant_id}",
        client_credential=client_secret
    )
    result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
    token = result.get("access_token")

    if not token:
        print("Failed to get token")
        return

    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient() as client:
        # Get site
        site_url = "https://graph.microsoft.com/v1.0/sites/eislaw.sharepoint.com:/sites/EISLAWTEAM"
        resp = await client.get(site_url, headers=headers)
        site_data = resp.json()
        site_id = site_data.get("id")
        print(f"Site ID: {site_id[:50]}...")

        # Get drive
        drive_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive"
        resp = await client.get(drive_url, headers=headers)
        drive_id = resp.json().get("id")
        print(f"Drive ID: {drive_id[:30]}...")

        # List root contents
        root_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/children"
        resp = await client.get(root_url, headers=headers)
        items = resp.json().get("value", [])

        print(f"\nRoot folder contents ({len(items)} items):")
        for item in items:
            type_str = "[folder]" if item.get("folder") else "[file]"
            name = item.get("name", "")
            print(f"  {type_str} {name}")

            # If it's a folder, check for Templates or clients
            if item.get("folder") and ("template" in name.lower() or "client" in name.lower()):
                subfolder_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item['id']}/children"
                sub_resp = await client.get(subfolder_url, headers=headers)
                sub_items = sub_resp.json().get("value", [])
                for sub in sub_items[:10]:
                    sub_type = "[folder]" if sub.get("folder") else "[file]"
                    print(f"      {sub_type} {sub.get('name')}")

if __name__ == "__main__":
    asyncio.run(main())
