import json
import os
import sys
import time
import random
import urllib.parse
import urllib.request
import ssl
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
# Structured logging
from worker_logging import get_worker_logger
logger = get_worker_logger("email_sync", "sync")



def load_json(p: Path) -> dict:
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding='utf-8'))


def graph_app_creds() -> dict | None:
    sec = load_json(REPO_ROOT / 'secrets.local.json')
    mg = sec.get('microsoft_graph', {})
    if not mg:
        return None
    return {
        'tenant_id': mg.get('tenant_id'),
        'client_id': mg.get('client_id'),
        'client_secret': mg.get('client_secret'),
        'endpoint': os.environ.get('GRAPH_ENDPOINT', 'https://graph.microsoft.com/v1.0'),
    }


def graph_token(creds: dict) -> str | None:
    tok_url = f"https://login.microsoftonline.com/{creds['tenant_id']}/oauth2/v2.0/token"
    data = urllib.parse.urlencode({
        'grant_type': 'client_credentials',
        'client_id': creds['client_id'],
        'client_secret': creds['client_secret'],
        'scope': 'https://graph.microsoft.com/.default',
    }).encode('utf-8')
    req = urllib.request.Request(tok_url, data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        raw = resp.read().decode('utf-8')
        return json.loads(raw).get('access_token')


def email_index_path() -> Path:
    # Align with backend readers
    p = REPO_ROOT / 'clients' / 'email_index.sqlite'
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def ensure_schema(dbp: Path):
    conn = sqlite3.connect(str(dbp))
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
              id TEXT PRIMARY KEY,
              client TEXT,
              received TEXT,
              subject TEXT,
              from_addr TEXT,
              to_addrs TEXT,
              cc_addrs TEXT,
              body_preview TEXT,
              json_path TEXT,
              eml_path TEXT,
              outlook_link TEXT,
              user_upn TEXT
            )
            """
        )
        # Simple migrations: ensure user_upn column exists
        cols = [r[1] for r in conn.execute('PRAGMA table_info(messages)').fetchall()]
        if 'user_upn' not in cols:
            conn.execute('ALTER TABLE messages ADD COLUMN user_upn TEXT')
        if 'body_preview' not in cols:
            conn.execute('ALTER TABLE messages ADD COLUMN body_preview TEXT')
        if 'outlook_link' not in cols:
            conn.execute('ALTER TABLE messages ADD COLUMN outlook_link TEXT')
        # Helpful indexes for paging and filtering
        try:
            conn.execute('CREATE INDEX IF NOT EXISTS idx_messages_received ON messages(received)')
        except Exception:
            pass
        try:
            conn.execute('CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_addr)')
        except Exception:
            pass
        try:
            conn.execute('CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_upn)')
        except Exception:
            pass
        # Optional FTS5 (best effort)
        try:
            conn.execute("""
                CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
                  subject,
                  body_preview,
                  content='messages',
                  content_rowid='rowid'
                )
            """)
        except Exception:
            # FTS5 may be unavailable; ignore
            pass
        conn.commit()
    finally:
        conn.close()


def state_path() -> Path:
    p = REPO_ROOT / 'clients' / 'email_sync_state.json'
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def load_state() -> dict:
    sp = state_path()
    if not sp.exists():
        return {}
    try:
        return json.loads(sp.read_text(encoding='utf-8'))
    except Exception:
        return {}


def save_state(st: dict) -> None:
    sp = state_path()
    try:
        sp.write_text(json.dumps(st, ensure_ascii=False, indent=2), encoding='utf-8')
    except Exception:
        pass


def build_participant_filter(addrs: list[str]) -> str:
    parts = []
    for a in addrs:
        a_esc = a.replace("'", "''")
        parts.append(f"from/emailAddress/address eq '{a_esc}'")
        parts.append(f"toRecipients/any(c:c/emailAddress/address eq '{a_esc}')")
        parts.append(f"ccRecipients/any(c:c/emailAddress/address eq '{a_esc}')")
    # OR across all participant checks
    ors = ' or '.join(parts)
    return f"({ors})" if ors else ''


def graph_list_messages(creds: dict, mailbox: str, since_iso: str, participants: list[str], top: int = 50, max_pages: int = 10) -> list[dict]:
    tok = graph_token(creds)
    if not tok:
        raise RuntimeError('could not acquire Graph token')
    headers = {
        'Authorization': f'Bearer {tok}',
        'Accept': 'application/json',
        'ConsistencyLevel': 'eventual',
    }
    sel = 'id,subject,receivedDateTime,from,toRecipients,ccRecipients,webLink,hasAttachments,bodyPreview,internetMessageId,conversationId'
    ctx = ssl.create_default_context()
    out_map: dict[str, dict] = {}
    terms = participants or ['']
    for term in terms:
        pages = 0
        qp = {
            '$select': sel,
            '$top': str(int(top)),
        }
        if term:
            qp['$search'] = f'"participants:{term}"'
        else:
            # No search term → allow orderBy
            qp['$orderby'] = 'receivedDateTime desc'
        url = f"{creds['endpoint'].rstrip('/')}/users/{urllib.parse.quote(mailbox)}/messages?{urllib.parse.urlencode(qp)}"
        while pages < max_pages:
            req = urllib.request.Request(url, headers=headers)
            try:
                with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
                    raw = resp.read().decode('utf-8')
                    j = json.loads(raw)
            except urllib.error.HTTPError as e:  # type: ignore[attr-defined]
                try:
                    err_raw = e.read().decode('utf-8')
                    raise RuntimeError(f"{e.code} {e.reason}: {err_raw}")
                except Exception:
                    raise
            for m in j.get('value', []):
                # Filter by since locally (receivedDateTime >= since_iso)
                try:
                    if (m.get('receivedDateTime') or '') >= since_iso:
                        out_map[m.get('id')] = m
                except Exception:
                    out_map[m.get('id')] = m
            next_link = j.get('@odata.nextLink')
            if not next_link:
                break
            url = next_link
            pages += 1
            time.sleep(0.2)
    return list(out_map.values())


def _http_get(url: str, headers: dict, timeout: float = 30.0, retries: int = 4) -> dict:
    ctx = ssl.create_default_context()
    last_err = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
                raw = resp.read().decode('utf-8')
                return json.loads(raw)
        except urllib.error.HTTPError as e:  # type: ignore[attr-defined]
            code = getattr(e, 'code', 0)
            if code in (429, 503):
                ra = 1.0
                try:
                    ra = float(e.headers.get('Retry-After', '1'))
                except Exception:
                    ra = 1.0
                sleep = ra + random.uniform(0, 1 + attempt)
                time.sleep(sleep)
                last_err = e
                continue
            # propagate other errors
            raise
        except Exception as e:
            last_err = e
            time.sleep(0.5 + random.uniform(0, 0.5))
    if last_err:
        raise last_err
    return {}


def graph_delta_messages(creds: dict, mailbox: str, select_fields: str, delta_link: str | None = None, top: int = 50, max_pages: int = 8) -> tuple[list[dict], str | None]:
    tok = graph_token(creds)
    if not tok:
        raise RuntimeError('could not acquire Graph token')
    headers = {
        'Authorization': f'Bearer {tok}',
        'Accept': 'application/json',
    }
    changes: list[dict] = []
    pages = 0
    if delta_link:
        url = delta_link
    else:
        url = f"{creds['endpoint'].rstrip('/')}/users/{urllib.parse.quote(mailbox)}/messages/delta?$select={urllib.parse.quote(select_fields)}&$top={int(top)}"
    next_url = url
    new_delta: str | None = None
    while next_url and pages < max_pages:
        try:
            j = _http_get(next_url, headers=headers)
        except urllib.error.HTTPError as e:  # type: ignore[attr-defined]
            if getattr(e, 'code', 0) == 410:
                # Bad delta link → caller should full-resync
                return [], None
            raise
        changes.extend(j.get('value', []))
        next_url = j.get('@odata.nextLink')
        new_delta = j.get('@odata.deltaLink') or new_delta
        pages += 1
        if not next_url:
            break
        time.sleep(0.2)
    return changes, new_delta


def load_registry_map() -> dict[str, str]:
    # Map email → client name from clients.json under store_base
    # Discover via AudoProcessor settings.json
    ap = Path('C:/Coding Projects/AudoProcessor Iterations/settings.json')
    if not ap.exists():
        return {}
    st = json.loads(ap.read_text(encoding='utf-8'))
    sb = (st.get('by_os', {}).get('windows', {}) or {}).get('store_base') or st.get('store_base')
    if not sb:
        return {}
    regp = Path(sb) / 'clients.json'
    if not regp.exists():
        return {}
    reg = json.loads(regp.read_text(encoding='utf-8'))
    mapping: dict[str, str] = {}
    for c in reg.get('clients', []):
        nm = c.get('display_name') or c.get('name') or ''
        emails = c.get('email')
        if isinstance(emails, str):
            emails = [emails]
        for e in (emails or []):
            if isinstance(e, str) and e:
                mapping[e.lower()] = nm
        for ct in c.get('contacts', []) or []:
            e = (ct or {}).get('email')
            if isinstance(e, str) and e:
                mapping[e.lower()] = nm
    return mapping


def upsert_messages(dbp: Path, user_upn: str, msgs: list[dict], regmap: dict[str, str]) -> int:
    conn = sqlite3.connect(str(dbp))
    try:
        cur = conn.cursor()
        n = 0
        for m in msgs:
            mid = m.get('id')
            if not mid:
                continue
            received = m.get('receivedDateTime') or ''
            subject = m.get('subject') or ''
            from_addr = (m.get('from') or {}).get('emailAddress', {}).get('address') or ''
            to_addrs = ','.join([(x.get('emailAddress') or {}).get('address') or '' for x in (m.get('toRecipients') or [])])
            cc_addrs = ','.join([(x.get('emailAddress') or {}).get('address') or '' for x in (m.get('ccRecipients') or [])])
            # Link to a client by participants
            candidates = [from_addr, *to_addrs.split(','), *cc_addrs.split(',')]
            client_name = ''
            for a in candidates:
                if a and regmap.get(a.lower()):
                    client_name = regmap[a.lower()]
                    break
            preview = (m.get('bodyPreview') or '')[:1000]
            outlook_link = m.get('webLink') or ''
            cur.execute(
                """
                INSERT OR REPLACE INTO messages (id, client, received, subject, from_addr, to_addrs, cc_addrs, body_preview, json_path, eml_path, outlook_link, user_upn)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (mid, client_name, received, subject, from_addr, to_addrs, cc_addrs, preview, '', '', outlook_link, user_upn)
            )
            n += 1
        conn.commit()
        return n
    finally:
        conn.close()


def apply_delta(dbp: Path, user_upn: str, changes: list[dict], regmap: dict[str, str]) -> dict:
    """Apply Graph delta changes. Removes rows with @removed, upserts others.
    Returns summary dict with counts.
    """
    removed = 0
    updated = 0
    conn = sqlite3.connect(str(dbp))
    try:
        cur = conn.cursor()
        for m in changes:
            mid = m.get('id')
            if not mid:
                continue
            if '@removed' in m:
                cur.execute('DELETE FROM messages WHERE id = ?', (mid,))
                removed += 1
                continue
            received = m.get('receivedDateTime') or ''
            subject = m.get('subject') or ''
            from_addr = (m.get('from') or {}).get('emailAddress', {}).get('address') or ''
            to_addrs = ','.join([(x.get('emailAddress') or {}).get('address') or '' for x in (m.get('toRecipients') or [])])
            cc_addrs = ','.join([(x.get('emailAddress') or {}).get('address') or '' for x in (m.get('ccRecipients') or [])])
            candidates = [from_addr, *to_addrs.split(','), *cc_addrs.split(',')]
            client_name = ''
            for a in candidates:
                if a and regmap.get(a.lower()):
                    client_name = regmap[a.lower()]
                    break
            preview = (m.get('bodyPreview') or '')[:1000]
            outlook_link = m.get('webLink') or ''
            cur.execute(
                """
                INSERT OR REPLACE INTO messages (id, client, received, subject, from_addr, to_addrs, cc_addrs, body_preview, json_path, eml_path, outlook_link, user_upn)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (mid, client_name, received, subject, from_addr, to_addrs, cc_addrs, preview, '', '', outlook_link, user_upn)
            )
            updated += 1
        conn.commit()
    finally:
        conn.close()
    return { 'removed': removed, 'updated': updated }


def main(argv: list[str]) -> int:
    cfg = load_json(REPO_ROOT / 'config' / 'email_sync.json')
    # CLI overrides
    participants = []
    since_days = None
    do_delta = False
    for i, a in enumerate(argv):
        if a == '--participants' and i + 1 < len(argv):
            participants = [x.strip() for x in argv[i+1].split(',') if x.strip()]
        if a == '--since-days' and i + 1 < len(argv):
            try:
                since_days = int(argv[i+1])
            except Exception:
                pass
        if a == '--delta':
            do_delta = True
    if not participants:
        participants = cfg.get('participants_allow') or []
    if since_days is None:
        since_days = int(cfg.get('since_days') or 90)

    creds = graph_app_creds()
    if not creds:
        logger.error('Graph credentials missing in secrets.local.json')
        return 2

    dbp = email_index_path()
    ensure_schema(dbp)
    regmap = load_registry_map()

    since_dt = (datetime.now(timezone.utc) - timedelta(days=since_days))
    since_iso = since_dt.replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    total = 0
    state = load_state()
    errors: list[str] = []
    for upn in cfg.get('mailboxes') or []:
        try:
            if do_delta:
                sel = 'id,subject,receivedDateTime,from,toRecipients,ccRecipients,bodyPreview,webLink'
                delta_link = ((state.get('mailboxes') or {}).get(upn) or {}).get('deltaLink')
                changes, new_delta = graph_delta_messages(creds, upn, sel, delta_link=delta_link, top=50, max_pages=12)
                # If delta link invalid → full resync from since_days
                if new_delta is None and not changes:
                    msgs = graph_list_messages(creds, upn, since_iso, participants, top=50, max_pages=6)
                    total += upsert_messages(dbp, upn, msgs, regmap)
                    # Obtain a fresh delta link after snapshot
                    changes2, new_delta2 = graph_delta_messages(creds, upn, sel, delta_link=None, top=50, max_pages=2)
                    if changes2:
                        apply_delta(dbp, upn, changes2, regmap)
                    if new_delta2:
                        state.setdefault('mailboxes', {}).setdefault(upn, {})['deltaLink'] = new_delta2
                else:
                    res = apply_delta(dbp, upn, changes, regmap)
                    total += int(res.get('updated', 0))
                    if new_delta:
                        state.setdefault('mailboxes', {}).setdefault(upn, {})['deltaLink'] = new_delta
                logger.info('Delta synced changes', upn=upn, change_count=len(changes))
            else:
                msgs = graph_list_messages(creds, upn, since_iso, participants, top=50, max_pages=6)
                total += upsert_messages(dbp, upn, msgs, regmap)
                logger.info('Synced messages', upn=upn, message_count=len(msgs))
        except Exception as e:
            errors.append(f'{upn}: {e}')
            logger.error('Sync failed for mailbox', upn=upn, error=str(e))
    if do_delta:
        save_state(state)
    logger.info('Email sync completed', ok=len(errors)==0, inserted_or_updated=total, error_count=len(errors), delta=do_delta)
    return 0 if not errors else 1


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
