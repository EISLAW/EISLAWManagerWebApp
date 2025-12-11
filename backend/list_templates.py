"""List templates in the templates folder"""
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

    if not all([client_id, client_secret, tenant_id]):
        print("Missing Graph credentials")
        return

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

        # List templates folder by path (Hebrew encoded)
        templates_folder = "טמפלייטים וורד שיירפוינט"
        folder_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{templates_folder}:/children"
        resp = await client.get(folder_url, headers=headers)

        if resp.status_code != 200:
            print(f"Failed: {resp.text}")
            return

        items = resp.json().get("value", [])
        print(f"Templates folder contents ({len(items)} items):")

        for item in items:
            name = item.get("name", "")
            item_id = item.get("id", "")
            is_folder = item.get("folder") is not None
            size = item.get("size", 0)

            if is_folder:
                print(f"\n[FOLDER] {name}")
                # List subfolder contents
                sub_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}/children"
                sub_resp = await client.get(sub_url, headers=headers)
                if sub_resp.status_code == 200:
                    sub_items = sub_resp.json().get("value", [])
                    for sub in sub_items:
                        sub_name = sub.get("name", "")
                        sub_id = sub.get("id", "")
                        if sub_name.endswith(".docx"):
                            print(f"    - {sub_name} (id: {sub_id[:20]}...)")
            elif name.endswith(".docx"):
                print(f"[FILE] {name} (id: {item_id[:20]}..., size: {size})")

if __name__ == "__main__":
    asyncio.run(main())
