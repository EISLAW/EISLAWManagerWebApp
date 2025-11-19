#!/usr/bin/env python3
import json
import time
import urllib.request
import urllib.parse

BASE = 'http://127.0.0.1:8788'


def _post(path: str, obj: dict) -> dict:
  data = json.dumps(obj).encode('utf-8')
  req = urllib.request.Request(BASE + path, data=data, headers={'Content-Type': 'application/json'}, method='POST')
  with urllib.request.urlopen(req, timeout=30) as resp:
    return json.loads(resp.read().decode('utf-8'))


def _get(path: str) -> dict:
  with urllib.request.urlopen(BASE + path, timeout=30) as resp:
    return json.loads(resp.read().decode('utf-8'))


def main():
  ts = int(time.time())
  name = f"ZZZ Test Client {ts}"
  email = f"test+{ts}@eislaw.co.il"
  contacts = [
    {"name": "Primary Contact", "email": f"primary+{ts}@example.com"},
    {"name": "Billing Contact", "email": f"billing+{ts}@example.com"},
  ]

  # Ensure SP folder
  sp = _post('/sp/folder_create', {"name": name})

  # Airtable client
  at_client = _post('/airtable/clients_upsert', {"name": name, "email": email})
  # Airtable contacts
  at_contacts = _post('/airtable/contacts_upsert', {"client_name": name, "contacts": contacts})

  # Registry upsert
  reg = _post('/registry/clients', {
    "display_name": name,
    "email": [email],
    "phone": "",
    "contacts": contacts,
    "airtable_id": at_client.get('id')
  })

  # Summary
  summary = _get('/api/client/summary?name=' + urllib.parse.quote(name))
  out = {
    'name': name,
    'email': email,
    'sharepoint': sp,
    'airtable_client': at_client,
    'airtable_contacts': at_contacts,
    'registry_entry': reg,
    'summary': summary,
  }
  with open('tools/test_client_result.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
  print('OK:', name)


if __name__ == '__main__':
  main()

