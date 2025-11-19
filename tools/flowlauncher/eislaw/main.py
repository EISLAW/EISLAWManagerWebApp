import json
import os
import webbrowser
import urllib.parse
from pathlib import Path

import requests

DEFAULT_FRONT = os.environ.get("EISLAW_FRONT_URL", "http://localhost:5173")
DEFAULT_API = os.environ.get("EISLAW_API_URL", "http://127.0.0.1:8799")


class FlowLauncher:
    def __init__(self):
        pass

    def query(self, query):
        q = (query or "").strip()
        parts = q.split()
        if not parts:
            return self._help()
        cmd = parts[0].lower()
        args = parts[1:]
        if cmd == "health":
            return [self._health_item()]
        if cmd == "clients":
            name = " ".join(args)
            return [self._open_client(name)] if name else self._help_clients()
        if cmd == "sync":
            name = " ".join(args)
            return [self._sync_item(name)]
        if cmd == "reindex":
            return [self._reindex_item()]
        if cmd == "search":
            term = " ".join(args)
            return self._search_items(term)
        if cmd == "grafana":
            return [self._open_url_item("Open Grafana", "http://localhost:3000")]
        if cmd == "prom":
            return [self._open_url_item("Open Prometheus", "http://localhost:9090")]
        if cmd == "meili":
            return [self._open_url_item("Open Meilisearch", "http://localhost:7700")]
        return self._help()

    def _help(self):
        return [
            self._item("health", "Check backend health", "ei health"),
            self._item("clients <name>", "Open client card", "ei clients rani"),
            self._item("sync <name>", "Sync emails for client", "ei sync rani"),
            self._item("reindex", "Reindex emails to Meilisearch", "ei reindex"),
            self._item("search <term>", "Search emails (Meili)", "ei search contract"),
            self._item("grafana", "Open Grafana", "ei grafana"),
            self._item("prom", "Open Prometheus", "ei prom"),
            self._item("meili", "Open Meilisearch", "ei meili"),
        ]

    def _help_clients(self):
        return [self._item("clients <name>", "Open client card", "ei clients rani")]

    def _item(self, title, subtitle, autocomplete=None, action=None):
        it = {
            "Title": title,
            "SubTitle": subtitle,
            "IcoPath": "icon.png",
        }
        if autocomplete:
            it["JsonRPCAction"] = {"method": "query", "parameters": [autocomplete], "dontHideAfterAction": False}
        if action:
            it["JsonRPCAction"] = action
        return it

    def _health_item(self):
        url = f"{DEFAULT_API}/health"
        try:
            r = requests.get(url, timeout=3)
            if r.ok:
                data = r.json()
                status = data.get("status")
                return self._item(f"Health: {status}", f"Version {data.get('version','')}", action={"method": "openUrl", "parameters": [url]})
        except Exception:
            pass
        return self._item("Health: unreachable", DEFAULT_API)

    def _open_client(self, name):
        if not name:
            return self._item("Missing client name", "ei clients <name>")
        href = f"{DEFAULT_FRONT}/#/clients/{urllib.parse.quote(name)}"
        return self._item(f"Open client: {name}", href, action={"method": "openUrl", "parameters": [href]})

    def _sync_item(self, name):
        if not name:
            return self._item("Sync emails", "usage: ei sync <client>")
        return self._item(
            f"Sync emails for {name}",
            f"POST /email/sync_client name={name}",
            action={"method": "syncEmails", "parameters": [name]}
        )

    def _reindex_item(self):
        return self._item(
            "Reindex emails to Meili",
            "POST /email/reindex_search",
            action={"method": "reindex"}
        )

    def _search_items(self, term):
        if not term:
            return [self._item("Search emails", "usage: ei search <term>")]
        url = f"{DEFAULT_API}/email/search?q={urllib.parse.quote(term)}&limit=5&offset=0"
        try:
            r = requests.get(url, timeout=5)
            if not r.ok:
                raise RuntimeError()
            data = r.json()
            items = []
            for it in data.get("items", [])[:5]:
                subj = it.get("subject") or "(no subject)"
                sender = it.get("from") or "(from?)"
                href = f"{DEFAULT_FRONT}/#/clients/{urllib.parse.quote(it.get('client') or '')}?tab=emails"
                items.append(self._item(f"{sender} — {subj}", it.get("received",""), action={"method": "openUrl", "parameters": [href]}))
            return items or [self._item("No results", term)]
        except Exception:
            return [self._item("Search failed", url)]

    def openUrl(self, url):
        webbrowser.open(url)

    def syncEmails(self, name):
        try:
            r = requests.post(f"{DEFAULT_API}/email/sync_client", json={"name": name, "since_days": 90}, timeout=8)
            ok = r.ok
        except Exception:
            ok = False
        return ok

    def reindex(self):
        try:
            r = requests.post(f"{DEFAULT_API}/email/reindex_search", timeout=15)
            ok = r.ok
        except Exception:
            ok = False
        return ok


if __name__ == "__main__":
    import sys
    query = sys.argv[1] if len(sys.argv) > 1 else ""
    print(json.dumps(FlowLauncher().query(query)))
