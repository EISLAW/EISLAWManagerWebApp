"""Verify uploaded document exists in client folder"""
import asyncio
import httpx
import msal
import json
import os

async def main():
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
        site_id = resp.json().get("id")

        # Get drive
        drive_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive"
        resp = await client.get(drive_url, headers=headers)
        drive_id = resp.json().get("id")

        # Check client folder
        client_folder = "לקוחות משרד/סיון בנימיני"
        folder_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{client_folder}:/children"
        resp = await client.get(folder_url, headers=headers)

        if resp.status_code == 200:
            items = resp.json().get("value", [])
            print(f"Files in '{client_folder}' folder ({len(items)} items):")
            for item in items[-5:]:  # Show last 5 items
                name = item.get("name", "")
                modified = item.get("lastModifiedDateTime", "")
                size = item.get("size", 0)
                print(f"  - {name}")
                print(f"    Modified: {modified}, Size: {size} bytes")
        else:
            print(f"Folder not found or error: {resp.status_code}")
            print(resp.text)

if __name__ == "__main__":
    asyncio.run(main())
