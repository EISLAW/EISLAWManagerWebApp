#!/usr/bin/env python3
import json, urllib.request, urllib.parse, time, pathlib

BASE = 'http://127.0.0.1:8788'

def post(path, obj):
  data = json.dumps(obj).encode('utf-8')
  req = urllib.request.Request(BASE + path, data=data, headers={'Content-Type': 'application/json'}, method='POST')
  with urllib.request.urlopen(req, timeout=30) as resp:
    return json.loads(resp.read().decode('utf-8'))

def get(path):
  with urllib.request.urlopen(BASE + path, timeout=30) as resp:
    return json.loads(resp.read().decode('utf-8'))

def main():
  result = json.loads(pathlib.Path('tools/test_client_result.json').read_text(encoding='utf-8'))
  name = result['name']
  new_email = f"ui.updated.{int(time.time())}@example.com"
  phone = "+972500000000"
  # Update registry
  post('/registry/clients', { 'display_name': name, 'email': [new_email], 'phone': phone })
  # Update Airtable
  post('/airtable/clients_upsert', { 'name': name, 'email': new_email })
  # Verify
  summary = get('/api/client/summary?name=' + urllib.parse.quote(name))
  out = {
    'name': name,
    'new_email': new_email,
    'summary_emails': summary.get('client',{}).get('emails',[]),
    'summary_phone': summary.get('client',{}).get('phone'),
  }
  pathlib.Path('tools/test_client_update_result.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
  print('OK')

if __name__ == '__main__':
  main()

