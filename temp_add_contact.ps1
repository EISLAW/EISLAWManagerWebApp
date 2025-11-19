$body = '{"client_name":"\u05e8\u05e0\u05d9 \u05d3\u05d1\u05d5\u05e9","contacts":[{"name":"\u05d0\u05d9\u05ea\u05df \u05e9\u05de\u05d9\u05e8","email":"eitan@eislaw.co.il","phone":"0525903675"}]}'
Invoke-RestMethod -Uri 'http://127.0.0.1:8799/airtable/contacts_upsert' -Method Post -ContentType 'application/json' -Body $body
