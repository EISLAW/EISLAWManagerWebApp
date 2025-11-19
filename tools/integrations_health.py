import json, os, sys, time
from pathlib import Path
import urllib.request, urllib.parse

ROOT = Path(__file__).resolve().parents[1]
SECRETS = ROOT / 'secrets.local.json'

def http(url, headers=None):
  req = urllib.request.Request(url, headers=headers or {})
  with urllib.request.urlopen(req, timeout=20) as r: # nosec - controlled
    return json.loads(r.read().decode('utf-8'))

def post(url, data, headers=None):
  body = urllib.parse.urlencode(data).encode('utf-8')
  req = urllib.request.Request(url, data=body, headers=headers or {})
  with urllib.request.urlopen(req, timeout=20) as r:
    return json.loads(r.read().decode('utf-8'))

def main():
  if not SECRETS.exists():
    print(json.dumps({"error":"missing secrets.local.json"}))
    return 2
  sec = json.loads(SECRETS.read_text(encoding='utf-8'))
  out = {"ok": True, "checks": {}}

  # Fillout
  try:
    key = sec.get('fillout',{}).get('api_key')
    if key:
      # Try Bearer first, fallback to X-API-KEY
      try:
        fo = http('https://api.fillout.com/v1/forms', headers={'Authorization': f'Bearer {key}'})
      except Exception:
        fo = http('https://api.fillout.com/v1/forms', headers={'X-API-KEY': key})
      out['checks']['fillout'] = {'ok': True, 'count': len(fo.get('forms',[])) if isinstance(fo,dict) else None}
    else:
      out['checks']['fillout'] = {'ok': False, 'error':'missing api_key'}
  except Exception as e:
    out['ok'] = False
    out['checks']['fillout'] = {'ok': False, 'error': str(e)}

  # Airtable
  try:
    at = sec.get('airtable',{})
    token, base, table = at.get('token'), at.get('base_id'), at.get('table_id')
    if token and base and table:
      url = f"https://api.airtable.com/v0/{base}/{table}?maxRecords=1"
      res = http(url, headers={'Authorization': f'Bearer {token}'})
      out['checks']['airtable'] = {'ok': True, 'records': len(res.get('records',[])) if isinstance(res,dict) else None}
    else:
      out['checks']['airtable'] = {'ok': False, 'error':'missing token/base_id/table_id'}
  except Exception as e:
    out['ok'] = False
    out['checks']['airtable'] = {'ok': False, 'error': str(e)}

  # Microsoft Graph (application token)
  try:
    mg = sec.get('microsoft_graph',{})
    tenant, cid, csec = mg.get('tenant_id'), mg.get('client_id'), mg.get('client_secret')
    if tenant and cid and csec:
      tok = post(f'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
                 { 'client_id': cid, 'client_secret': csec, 'grant_type':'client_credentials', 'scope':'https://graph.microsoft.com/.default' },
                 headers={'Content-Type':'application/x-www-form-urlencoded'})
      access = tok.get('access_token')
      ok = bool(access)
      out['checks']['microsoft_graph'] = {'ok': ok}
    else:
      out['checks']['microsoft_graph'] = {'ok': False, 'error':'missing tenant/client/secret'}
  except Exception as e:
    out['ok'] = False
    out['checks']['microsoft_graph'] = {'ok': False, 'error': str(e)}

  # Azure ARM (subscriptions)
  try:
    mg = sec.get('microsoft_graph',{})
    tenant, cid, csec = mg.get('tenant_id'), mg.get('client_id'), mg.get('client_secret')
    if tenant and cid and csec:
      tok = post(f'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
                 { 'client_id': cid, 'client_secret': csec, 'grant_type':'client_credentials', 'scope':'https://management.azure.com/.default' },
                 headers={'Content-Type':'application/x-www-form-urlencoded'})
      access = tok.get('access_token')
      if access:
        subs = http('https://management.azure.com/subscriptions?api-version=2020-01-01', headers={'Authorization': f'Bearer {access}'})
        out['checks']['azure'] = {'ok': True, 'subscriptions': [s.get('subscriptionId') for s in subs.get('value',[])]}
      else:
        out['checks']['azure'] = {'ok': False, 'error':'no token'}
    else:
      out['checks']['azure'] = {'ok': False, 'error':'missing tenant/client/secret'}
  except Exception as e:
    out['ok'] = False
    out['checks']['azure'] = {'ok': False, 'error': str(e)}

  print(json.dumps(out, ensure_ascii=False, indent=2))
  return 0 if out['ok'] else 1

if __name__ == '__main__':
  sys.exit(main())
