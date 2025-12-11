#!/usr/bin/env python3
"""
Patch script to add missing search_emails_by_client function to main.py
Run this on the VM: python3 email_fix_patch.py
"""

import re

# The missing function to add
MISSING_FUNCTION = '''
# ========== EMAIL HELPER FUNCTIONS (restored 2025-12-07) ==========

def search_emails_by_client(client_name: str, since_days: int = 45, top: int = 50):
    """
    Search for emails from/to the client.
    First tries to find client's email addresses, then searches by those addresses.
    Falls back to name search if no email addresses found.
    Uses Microsoft Graph API search capabilities.
    """
    token = get_graph_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    # Calculate date filter
    from_date = (datetime.utcnow() - timedelta(days=since_days)).strftime("%Y-%m-%dT00:00:00Z")

    # Try to get client's email addresses from local registry
    client_emails = []
    client_data = find_local_client_by_name(client_name)
    if client_data:
        # Get primary emails
        emails_list = client_data.get("emails", [])
        if isinstance(emails_list, list):
            client_emails.extend([e for e in emails_list if e and "@" in e])
        elif isinstance(emails_list, str) and "@" in emails_list:
            client_emails.append(emails_list)

        # Get contact emails
        for contact in client_data.get("contacts", []):
            if contact.get("email") and "@" in contact.get("email", ""):
                client_emails.append(contact["email"])

    # Remove duplicates and filter out placeholder emails
    client_emails = list(set([
        e for e in client_emails
        if e and "@" in e and not e.startswith("no-email+")
    ]))

    # If no valid emails, fall back to name search
    if not client_emails:
        search_queries = [client_name.replace('"', '\\\\"')]
    else:
        search_queries = [email.replace('"', '\\\\"') for email in client_emails]

    emails_found = []

    with httpx.Client(timeout=60.0) as http_client:
        users_url = "https://graph.microsoft.com/v1.0/users?$select=id,mail,displayName&$top=10"
        users_resp = http_client.get(users_url, headers=headers)

        if users_resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Cannot access mailboxes: {users_resp.text}")

        users_data = users_resp.json()
        users = users_data.get("value", [])

        for user in users:
            user_id = user.get("id")
            user_email = user.get("mail")
            if not user_id:
                continue

            for search_query in search_queries:
                if "@" in search_query:
                    search_term_with_date = f"(from:{search_query} OR to:{search_query}) AND received>={from_date[:10]}"
                else:
                    search_term_with_date = f"{search_query} AND received>={from_date[:10]}"

                messages_url = (
                    f"https://graph.microsoft.com/v1.0/users/{user_id}/messages"
                    f"?$search=\\"{search_term_with_date}\\""
                    f"&$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,hasAttachments,webLink,isRead"
                    f"&$top={top}"
                )

                try:
                    msg_resp = http_client.get(messages_url, headers=headers)
                    if msg_resp.status_code == 200:
                        msg_data = msg_resp.json()
                        for msg in msg_data.get("value", []):
                            from_addr = msg.get("from", {}).get("emailAddress", {})
                            to_addrs = msg.get("toRecipients", [])

                            emails_found.append({
                                "id": msg.get("id"),
                                "subject": msg.get("subject", "(ללא נושא)"),
                                "from": from_addr.get("address", ""),
                                "fromName": from_addr.get("name", ""),
                                "to": [t.get("emailAddress", {}).get("address", "") for t in to_addrs],
                                "date": msg.get("receivedDateTime"),
                                "preview": msg.get("bodyPreview", "")[:200],
                                "has_attachments": msg.get("hasAttachments", False),
                                "attachments_count": len(msg.get("attachments", [])) if msg.get("hasAttachments") else 0,
                                "is_read": msg.get("isRead", True),
                                "webLink": msg.get("webLink"),
                                "mailbox": user_email,
                            })
                except Exception:
                    continue

    seen_ids = set()
    unique_emails = []
    for email in sorted(emails_found, key=lambda x: x.get("date", ""), reverse=True):
        if email["id"] not in seen_ids:
            seen_ids.add(email["id"])
            unique_emails.append(email)

    return unique_emails[:top]


# ========== ADDITIONAL EMAIL ENDPOINTS (added 2025-12-07) ==========

@app.get("/email/search")
def email_search(q: str, limit: int = 25):
    """
    Search all mailboxes for emails matching a query.
    Used by TaskFiles attach email modal search box.
    """
    if not q or len(q.strip()) < 2:
        return {"items": [], "total": 0}

    token = get_graph_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    emails_found = []
    search_term = q.strip().replace('"', '\\\\"')

    with httpx.Client(timeout=60.0) as http_client:
        # Get users
        users_url = "https://graph.microsoft.com/v1.0/users?$select=id,mail&$top=5"
        users_resp = http_client.get(users_url, headers=headers)

        if users_resp.status_code != 200:
            return {"items": [], "total": 0, "error": "Cannot access mailboxes"}

        users = users_resp.json().get("value", [])

        for user in users:
            user_id = user.get("id")
            if not user_id:
                continue

            messages_url = (
                f"https://graph.microsoft.com/v1.0/users/{user_id}/messages"
                f"?$search=\\"{search_term}\\""
                f"&$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments"
                f"&$top={limit}"
            )

            try:
                msg_resp = http_client.get(messages_url, headers=headers)
                if msg_resp.status_code == 200:
                    for msg in msg_resp.json().get("value", []):
                        from_addr = msg.get("from", {}).get("emailAddress", {})
                        emails_found.append({
                            "id": msg.get("id"),
                            "subject": msg.get("subject", "(ללא נושא)"),
                            "from": from_addr.get("address", ""),
                            "received": msg.get("receivedDateTime"),
                            "preview": msg.get("bodyPreview", "")[:200],
                            "has_attachments": msg.get("hasAttachments", False),
                        })
            except Exception:
                continue

    # Dedupe and limit
    seen = set()
    items = []
    for e in emails_found:
        if e["id"] not in seen:
            seen.add(e["id"])
            items.append(e)
            if len(items) >= limit:
                break

    return {"items": items, "total": len(items)}


@app.get("/email/content")
def email_content(id: str, client: str = ""):
    """
    Get full email content (HTML body) for viewing in modal.
    """
    if not id:
        raise HTTPException(status_code=400, detail="Email ID required")

    token = get_graph_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=30.0) as http_client:
        # Get users to search through
        users_url = "https://graph.microsoft.com/v1.0/users?$select=id,mail&$top=5"
        users_resp = http_client.get(users_url, headers=headers)

        if users_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Cannot access mailboxes")

        users = users_resp.json().get("value", [])

        for user in users:
            user_id = user.get("id")
            if not user_id:
                continue

            msg_url = f"https://graph.microsoft.com/v1.0/users/{user_id}/messages/{id}?$select=id,subject,from,toRecipients,receivedDateTime,body"

            try:
                msg_resp = http_client.get(msg_url, headers=headers)
                if msg_resp.status_code == 200:
                    msg = msg_resp.json()
                    from_addr = msg.get("from", {}).get("emailAddress", {})
                    return {
                        "id": msg.get("id"),
                        "subject": msg.get("subject", ""),
                        "from": from_addr.get("address", ""),
                        "received": msg.get("receivedDateTime"),
                        "html": msg.get("body", {}).get("content", ""),
                    }
            except Exception:
                continue

    raise HTTPException(status_code=404, detail="Email not found")


@app.post("/email/open")
def email_open(payload: dict = Body(...)):
    """
    Get Outlook Web App link for an email.
    Returns the OWA deeplink URL.
    """
    email_id = payload.get("id", "")
    if not email_id:
        raise HTTPException(status_code=400, detail="Email ID required")

    token = get_graph_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=30.0) as http_client:
        users_url = "https://graph.microsoft.com/v1.0/users?$select=id,mail&$top=5"
        users_resp = http_client.get(users_url, headers=headers)

        if users_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Cannot access mailboxes")

        users = users_resp.json().get("value", [])

        for user in users:
            user_id = user.get("id")
            user_mail = user.get("mail", "")
            if not user_id:
                continue

            msg_url = f"https://graph.microsoft.com/v1.0/users/{user_id}/messages/{email_id}?$select=id,webLink"

            try:
                msg_resp = http_client.get(msg_url, headers=headers)
                if msg_resp.status_code == 200:
                    msg = msg_resp.json()
                    web_link = msg.get("webLink", "")
                    if web_link:
                        return {"link": web_link, "desktop_launched": False}
            except Exception:
                continue

    raise HTTPException(status_code=404, detail="Email not found")


'''

def patch_main_py():
    """Add the missing function to main.py"""
    main_py_path = "/home/azureuser/EISLAWManagerWebApp/backend/main.py"

    # Read current file
    with open(main_py_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if function already exists
    if 'def search_emails_by_client' in content:
        print("search_emails_by_client already exists in main.py")
        return False

    # Find the location to insert - before @app.post("/email/sync_client")
    insert_marker = '@app.post("/email/sync_client")'

    if insert_marker not in content:
        print(f"Could not find {insert_marker} in main.py")
        return False

    # Insert the missing function before the marker
    new_content = content.replace(insert_marker, MISSING_FUNCTION + "\n" + insert_marker)

    # Backup and write
    backup_path = main_py_path + ".backup-email-fix"
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
        print("\n✅ Patch applied successfully!")
        print("Restart the API container: /usr/local/bin/docker-compose-v2 restart api")
    else:
        print("\n❌ Patch failed or not needed")
