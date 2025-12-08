import sys
sys.path.insert(0, "/app/backend")
from main import get_graph_access_token
import httpx

token = get_graph_access_token()
headers = {"Authorization": f"Bearer {token}"}

resp = httpx.get("https://graph.microsoft.com/v1.0/users", headers=headers, params={"$select": "id,mail,displayName", "$top": "10"})
print("Users found:")
users = resp.json().get("value", [])
for u in users:
    dn = u.get("displayName", "?")
    ml = u.get("mail", "?")
    print(f"  {dn}: {ml}")

email_id = "AAMkAGYzNzQ3NThhLWVkOGQtNDJlMC1iYzBkLWFmZGRhMWI4NjRlYQBGAAAAAAAIJ8Vu3g_rSI1rdfqP2WW7BwApi2IKuXg2QJZLIBw8EBXsAAAAAAEJAAApi2IKuXg2QJZLIBw8EBXsAAWOmgLLAAA="
print(f"\nSearching for email...")

for u in users:
    user_id = u.get("id")
    mail = u.get("mail", "?")
    try:
        att_url = f"https://graph.microsoft.com/v1.0/users/{user_id}/messages/{email_id}/attachments"
        att_resp = httpx.get(att_url, headers=headers, params={"$select": "id,name,size"})
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
    print("Email not found in any mailbox!")
