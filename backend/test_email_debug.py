import httpx
import json

# Get Graph credentials from secrets
with open("/app/secrets.local.json") as f:
    secrets = json.load(f)
graph = secrets.get("microsoft_graph", {})
client_id = graph.get("client_id")
client_secret = graph.get("client_secret")
tenant_id = graph.get("tenant_id")

# Get access token
token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
token_data = {
    "client_id": client_id,
    "client_secret": client_secret,
    "scope": "https://graph.microsoft.com/.default",
    "grant_type": "client_credentials"
}
token_resp = httpx.post(token_url, data=token_data)
token = token_resp.json().get("access_token")
print(f"Got token: {token[:30]}...")

headers = {"Authorization": f"Bearer {token}"}

# Get users
resp = httpx.get("https://graph.microsoft.com/v1.0/users", headers=headers, params={"$select": "id,mail,displayName", "$top": "15"})
print(f"\nUsers found ({resp.status_code}):")
users = resp.json().get("value", [])
for u in users:
    dn = u.get("displayName", "?")
    ml = u.get("mail", "?")
    print(f"  {dn}: {ml}")

# Search for email
email_id = "AAMkAGYzNzQ3NThhLWVkOGQtNDJlMC1iYzBkLWFmZGRhMWI4NjRlYQBGAAAAAAAIJ8Vu3g_rSI1rdfqP2WW7BwApi2IKuXg2QJZLIBw8EBXsAAAAAAEJAAApi2IKuXg2QJZLIBw8EBXsAAWOmgLLAAA="
print(f"\nSearching for email in mailboxes...")

for u in users:
    user_id = u.get("id")
    mail = u.get("mail", "?")
    try:
        att_url = f"https://graph.microsoft.com/v1.0/users/{user_id}/messages/{email_id}/attachments"
        att_resp = httpx.get(att_url, headers=headers, params={"$select": "id,name,size"}, timeout=30.0)
        if att_resp.status_code == 200:
            atts = att_resp.json().get("value", [])
            print(f"FOUND in {mail}: {len(atts)} attachments")
            for a in atts:
                n = a.get("name", "?")
                s = a.get("size", 0)
                print(f"   - {n} ({s} bytes)")
            break
        elif att_resp.status_code == 404:
            print(f"Not in {mail}")
        else:
            print(f"Error {mail}: {att_resp.status_code}")
    except Exception as e:
        print(f"Exception {mail}: {e}")
else:
    print("\nEmail not found in any of the searched mailboxes!")
