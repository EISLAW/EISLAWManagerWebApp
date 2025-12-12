#!/usr/bin/env python3
"""
Auto Jacob Review Runner (CLI-only)

Watches `docs/TEAM_INBOX.md` for lines that start with:
  AUTO_JACOB_REVIEW: TASK=... BRANCH=... BASE=... [COMMIT=...] [SCOPE=...]

Then runs Jacob via CLI (Codex preferred, Claude fallback) and writes a verdict
row back into the TEAM_INBOX "Messages TO Joe" table.

Design goals:
- CLI-only (uses CEO subscriptions), no backend LLM API integration
- Safe parsing (treat TEAM_INBOX as untrusted)
- Idempotent (state file dedupe)
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Optional


TRIGGER_PREFIX = "AUTO_JACOB_REVIEW:"
DEFAULT_INBOX_REL = Path("docs") / "TEAM_INBOX.md"
DEFAULT_STATE_ABS = Path.home() / ".eislaw" / "auto_jacob_review_state.json"
DEFAULT_OUTPUT_DIR_ABS = Path.home() / ".eislaw" / "auto_jacob_review_outputs"

TASK_RE = re.compile(r"^[A-Z]+-[0-9]+[A-Z0-9-_.]*$")
BRANCH_RE = re.compile(r"^(feature|hotfix)/[A-Za-z0-9._-]+$")
BASE_RE = re.compile(r"^(main|dev-main-[0-9-]+|(dev-main|release|hotfix|feature)/[A-Za-z0-9._-]+)$")


@dataclass(frozen=True)
class ReviewRequest:
    task_id: str
    branch: str
    base: str
    commit: Optional[str] = None
    scope: Optional[str] = None
    raw_line: str = ""
    line_number: int = -1


class RunnerError(RuntimeError):
    pass


def _run(cmd: list[str], cwd: Path, timeout_s: int = 120) -> str:
    try:
        result = subprocess.run(
            cmd,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout_s,
            check=False,
        )
    except subprocess.TimeoutExpired as e:
        raise RunnerError(f"Command timed out: {' '.join(cmd)}") from e

    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        stdout = (result.stdout or "").strip()
        details = stderr if stderr else stdout
        raise RunnerError(f"Command failed ({result.returncode}): {' '.join(cmd)}\n{details}")
    return (result.stdout or "").strip()


def _which(binary: str) -> Optional[str]:
    from shutil import which

    return which(binary)


def _read_text_preserve_newlines(path: Path) -> tuple[str, str]:
    content = path.read_text(encoding="utf-8")
    newline = "\r\n" if "\r\n" in content else "\n"
    return content, newline


def _load_state(state_path: Path) -> dict[str, Any]:
    if not state_path.exists():
        return {"processed": {}}
    try:
        return json.loads(state_path.read_text(encoding="utf-8"))
    except Exception as e:
        raise RunnerError(f"Failed to read state file: {state_path}: {e}") from e


def _save_state(state_path: Path, state: dict[str, Any]) -> None:
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _is_dirty_repo(repo_root: Path) -> bool:
    out = _run(["git", "status", "--porcelain"], cwd=repo_root, timeout_s=30)
    return bool(out.strip())


def _fetch_branch(repo_root: Path, branch: str) -> None:
    _run(["git", "fetch", "origin", branch], cwd=repo_root, timeout_s=120)


def _rev_parse(repo_root: Path, rev: str) -> str:
    return _run(["git", "rev-parse", rev], cwd=repo_root, timeout_s=30).strip()

def _worktree_add(repo_root: Path, worktree_dir: Path, commit_sha: str) -> None:
    if worktree_dir.exists():
        _worktree_remove(repo_root, worktree_dir)
    worktree_dir.parent.mkdir(parents=True, exist_ok=True)
    _run(["git", "worktree", "add", "--detach", str(worktree_dir), commit_sha], cwd=repo_root, timeout_s=180)


def _worktree_remove(repo_root: Path, worktree_dir: Path) -> None:
    if not worktree_dir.exists():
        return
    try:
        _run(["git", "worktree", "remove", "--force", str(worktree_dir)], cwd=repo_root, timeout_s=120)
    finally:
        # Best-effort cleanup of stale metadata
        try:
            _run(["git", "worktree", "prune"], cwd=repo_root, timeout_s=120)
        except RunnerError:
            pass


def _checkout(repo_root: Path, branch: str) -> None:
    _run(["git", "checkout", branch], cwd=repo_root, timeout_s=60)


def _pull(repo_root: Path) -> None:
    _run(["git", "pull", "--ff-only"], cwd=repo_root, timeout_s=120)


def _safe_parse_trigger_line(line: str, line_number: int) -> Optional[ReviewRequest]:
    """Parse trigger line with STRICT validation.

    STRICT mode (per Jacob's AOS-032 review):
    1. Trigger must start at column 0 (no leading whitespace)
    2. All tokens must be valid KEY=VALUE pairs with recognized keys
    3. No extra content allowed (prevents command injection attempts)
    """
    # STRICT: must start at column 0 (no leading whitespace)
    if not line.startswith(TRIGGER_PREFIX):
        return None

    payload = line[len(TRIGGER_PREFIX):].strip()
    if not payload:
        return None

    # STRICT: only these keys are allowed
    ALLOWED_KEYS = {"TASK", "BRANCH", "BASE", "COMMIT", "SCOPE"}
    fields: dict[str, str] = {}

    for token in payload.split():
        # STRICT: every token must be KEY=VALUE
        if "=" not in token:
            return None  # Reject non-key=value tokens
        key, value = token.split("=", 1)
        key = key.strip().upper()
        value = value.strip()
        if not key or not value:
            return None  # Reject empty key or value
        if key not in ALLOWED_KEYS:
            return None  # Reject unknown keys
        fields[key] = value

    task_id = fields.get("TASK")
    branch = fields.get("BRANCH")
    base = fields.get("BASE")
    commit = fields.get("COMMIT")
    scope = fields.get("SCOPE")

    if not task_id or not branch or not base:
        return None

    if not TASK_RE.match(task_id):
        return None
    if not BRANCH_RE.match(branch):
        return None
    if not BASE_RE.match(base):
        return None
    if commit and not re.fullmatch(r"[0-9a-fA-F]{7,40}", commit):
        return None

    return ReviewRequest(
        task_id=task_id,
        branch=branch,
        base=base,
        commit=commit,
        scope=scope,
        raw_line=line.rstrip("\n"),
        line_number=line_number,
    )


def _find_requests(inbox_path: Path) -> list[ReviewRequest]:
    content, _ = _read_text_preserve_newlines(inbox_path)
    requests: list[ReviewRequest] = []
    for i, line in enumerate(content.splitlines(), start=1):
        req = _safe_parse_trigger_line(line, i)
        if req:
            requests.append(req)
    return requests


def _dedupe_key(task_id: str, branch: str, commit: str) -> str:
    return f"{task_id}|{branch}|{commit}"


def _append_team_inbox_row(
    inbox_path: Path,
    agent_name: str,
    status: str,
    task_id: str,
    message: str,
) -> None:
    content, newline = _read_text_preserve_newlines(inbox_path)

    table_header = "| From | Status | Message |"
    separator_row = "|------|--------|---------|"

    header_pos = content.find(table_header)
    if header_pos == -1:
        raise RunnerError("Could not find 'Messages TO Joe' table header in TEAM_INBOX.md")

    sep_pos = content.find(separator_row, header_pos)
    if sep_pos == -1:
        raise RunnerError("Could not find 'Messages TO Joe' table separator row in TEAM_INBOX.md")

    # Insert immediately after the separator row newline
    newline_pos = content.find(newline, sep_pos)
    if newline_pos == -1:
        raise RunnerError("Could not find newline after table separator row in TEAM_INBOX.md")
    insert_pos = newline_pos + len(newline)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    safe_message = message.replace("\n", "<br>")
    new_row = f"| **{agent_name}** | {status} | **{task_id} ({timestamp}):** {safe_message} |{newline}"

    updated = content[:insert_pos] + new_row + content[insert_pos:]
    inbox_path.write_text(updated, encoding="utf-8", newline=newline)


def _status_for_verdict(verdict: str) -> str:
    verdict_upper = verdict.upper()
    if "APPROVED" in verdict_upper and "NEEDS_FIXES" not in verdict_upper and "BLOCKED" not in verdict_upper:
        return "✅ **APPROVED**"
    if "NEEDS_FIXES" in verdict_upper or "NEEDS FIXES" in verdict_upper:
        return "❌ **NEEDS_FIXES**"
    if "BLOCKED" in verdict_upper:
        return "❌ **BLOCKED**"
    return "⚠️ **REVIEW_RESULT**"


def _extract_verdict(output: str) -> str:
    for line in output.splitlines():
        if line.strip().upper().startswith("VERDICT:"):
            return line.split(":", 1)[1].strip()
    upper = output.upper()
    if "NEEDS_FIXES" in upper or "NEEDS FIXES" in upper:
        return "NEEDS_FIXES"
    if "BLOCKED" in upper:
        return "BLOCKED"
    if "APPROVED" in upper and "NOT APPROVED" not in upper:
        return "APPROVED"
    return "UNKNOWN"


def _build_jacob_prompt(req: ReviewRequest, base_sha: str, commit_sha: str) -> str:
    scope_hint = f"\nScope hint: {req.scope}" if req.scope else ""
    return f"""You are Jacob (Skeptical CTO / Quality Gate).

Review task {req.task_id} on branch {req.branch} (commit {commit_sha}) against base {req.base} ({base_sha}).

Mandatory review steps:
1) Inspect changes: run `git diff {base_sha}...HEAD` and `git status`.
2) Identify touched areas (backend/frontend/docs).
3) Run the most relevant tests you can quickly run. If you cannot run tests, explicitly state why.
4) Verify required docs updates per our process (API endpoints inventory, data stores, module specs, mkdocs nav) when applicable.

Output requirements (machine-parseable):
- First line MUST be: `VERDICT: APPROVED` or `VERDICT: NEEDS_FIXES: <reason>` or `VERDICT: BLOCKED: <reason>`
- Then provide a short bullet list of findings and the next steps.

Do not commit or push. Post only the review verdict and rationale.{scope_hint}
"""


def _run_jacob_via_codex(prompt: str, repo_root: Path, timeout_s: int) -> str:
    codex_path = _which("codex")
    if not codex_path:
        raise RunnerError("codex CLI not found in PATH")
    cmd = [
        codex_path,
        "exec",
        "--skip-git-repo-check",
        "--dangerously-bypass-approvals-and-sandbox",
        prompt,
    ]
    return _run(cmd, cwd=repo_root, timeout_s=timeout_s)


def _run_jacob_via_claude(prompt: str, repo_root: Path, timeout_s: int) -> str:
    claude_path = _which("claude")
    if not claude_path:
        raise RunnerError("claude CLI not found in PATH")
    cmd = [
        claude_path,
        "-p",
        prompt,
        "--model",
        "opus",
        "--tools",
        "default",
        "--dangerously-skip-permissions",
    ]
    return _run(cmd, cwd=repo_root, timeout_s=timeout_s)


def _process_one(
    repo_root: Path,
    inbox_path: Path,
    state_path: Path,
    req: ReviewRequest,
    engine: str,
    timeout_s: int,
    dry_run: bool,
    worktree_root: Path,
    output_dir: Path,
) -> bool:
    # Ensure we have latest branch ref
    try:
        _fetch_branch(repo_root, req.branch)
    except RunnerError:
        # Branch may be local-only; continue.
        pass

    # Ensure base ref exists (best-effort)
    try:
        if req.base != "main":
            _fetch_branch(repo_root, req.base)
        else:
            _run(["git", "fetch", "origin", "main"], cwd=repo_root, timeout_s=120)
    except RunnerError:
        pass

    # Resolve commit sha
    commit_sha = req.commit
    if not commit_sha:
        try:
            commit_sha = _rev_parse(repo_root, f"origin/{req.branch}")
        except RunnerError:
            commit_sha = _rev_parse(repo_root, req.branch)

    # Resolve base sha (prefer origin/base if present)
    try:
        base_sha = _rev_parse(repo_root, f"origin/{req.base}") if req.base != "main" else _rev_parse(repo_root, "origin/main")
    except RunnerError:
        base_sha = _rev_parse(repo_root, req.base)

    state = _load_state(state_path)
    processed: dict[str, Any] = state.setdefault("processed", {})
    key = _dedupe_key(req.task_id, req.branch, commit_sha)
    if key in processed:
        return False

    if dry_run:
        print(f"[DRY RUN] Would review: {key} (engine={engine})")
        return False

    # Work in an isolated worktree so we never disrupt the user's current branch or dirty working tree.
    worktree_dir = worktree_root / req.task_id / commit_sha[:12]
    _worktree_add(repo_root, worktree_dir, commit_sha)

    prompt = _build_jacob_prompt(req, base_sha=base_sha, commit_sha=commit_sha)

    try:
        if engine == "codex":
            output = _run_jacob_via_codex(prompt, repo_root=worktree_dir, timeout_s=timeout_s)
        elif engine == "claude":
            output = _run_jacob_via_claude(prompt, repo_root=worktree_dir, timeout_s=timeout_s)
        else:  # auto
            if _which("codex"):
                output = _run_jacob_via_codex(prompt, repo_root=worktree_dir, timeout_s=timeout_s)
            else:
                output = _run_jacob_via_claude(prompt, repo_root=worktree_dir, timeout_s=timeout_s)
    finally:
        _worktree_remove(repo_root, worktree_dir)

    verdict = _extract_verdict(output)
    status = _status_for_verdict(verdict)

    # Persist full output to an artifact file to avoid bloating TEAM_INBOX.
    output_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    artifact_path = output_dir / req.task_id / f"{commit_sha[:12]}_{ts}.txt"
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(output.strip() + "\n", encoding="utf-8")

    output_excerpt = output.strip()
    if len(output_excerpt) > 1200:
        output_excerpt = output_excerpt[:1200] + "\n…(truncated; see artifact file)…"

    # Write inbox update
    message = (
        f"AUTO-JACOB-REVIEW: {verdict} (branch `{req.branch}`, base `{req.base}`, commit `{commit_sha[:12]}`)<br>"
        f"Artifact: `{artifact_path}`<br>"
        f"Review excerpt:<br>{output_excerpt}"
    )
    _append_team_inbox_row(
        inbox_path=inbox_path,
        agent_name="Jacob",
        status=status,
        task_id=req.task_id,
        message=message,
    )

    processed[key] = {
        "task": req.task_id,
        "branch": req.branch,
        "base": req.base,
        "commit": commit_sha,
        "verdict": verdict,
        "processed_at": datetime.utcnow().isoformat() + "Z",
        "inbox_line": req.line_number,
    }
    _save_state(state_path, state)
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Auto-trigger Jacob reviews (CLI-only).")
    parser.add_argument("--repo", default=None, help="Repo root (defaults to tools/..).")
    parser.add_argument("--inbox", default=None, help="Path to TEAM_INBOX.md")
    parser.add_argument("--state", default=None, help="Path to state JSON")
    parser.add_argument("--output-dir", default=None, help="Directory to write full review artifacts (defaults to ~/.eislaw/...).")
    parser.add_argument("--worktree-root", default=None, help="Directory to place temporary worktrees (defaults to <repo>/.eislaw/worktrees).")
    parser.add_argument("--engine", choices=["auto", "codex", "claude"], default="auto")
    parser.add_argument("--timeout", type=int, default=1800, help="LLM run timeout (seconds).")
    parser.add_argument("--once", action="store_true", help="Process once then exit.")
    parser.add_argument("--watch", action="store_true", help="Watch forever (poll).")
    parser.add_argument("--interval", type=int, default=30, help="Poll interval seconds (watch mode).")
    parser.add_argument("--dry-run", action="store_true", help="Detect triggers but do not run or write.")

    args = parser.parse_args()

    tools_dir = Path(__file__).resolve().parent
    repo_root = Path(args.repo).resolve() if args.repo else tools_dir.parent
    inbox_path = Path(args.inbox).resolve() if args.inbox else (repo_root / DEFAULT_INBOX_REL)
    state_path = Path(args.state).resolve() if args.state else DEFAULT_STATE_ABS
    output_dir = Path(args.output_dir).resolve() if args.output_dir else DEFAULT_OUTPUT_DIR_ABS
    worktree_root = Path(args.worktree_root).resolve() if args.worktree_root else (repo_root / ".eislaw" / "worktrees")

    if not inbox_path.exists():
        print(f"ERROR: TEAM_INBOX not found: {inbox_path}", file=sys.stderr)
        return 2

    if not (args.once or args.watch):
        # Default behavior: run once.
        args.once = True

    def loop_once() -> int:
        try:
            requests = _find_requests(inbox_path)
        except RunnerError as e:
            print(f"ERROR: {e}", file=sys.stderr)
            return 2

        if not requests:
            return 0

        # Process newest-to-oldest
        for req in reversed(requests):
            try:
                did = _process_one(
                    repo_root=repo_root,
                    inbox_path=inbox_path,
                    state_path=state_path,
                    req=req,
                    engine=args.engine,
                    timeout_s=args.timeout,
                    dry_run=args.dry_run,
                    worktree_root=worktree_root,
                    output_dir=output_dir,
                )
                if did:
                    print(f"[OK] Reviewed {req.task_id} on {req.branch}")
            except RunnerError as e:
                print(f"[ERROR] {req.task_id} ({req.branch}): {e}", file=sys.stderr)
        return 0

    if args.once:
        return loop_once()

    while True:
        loop_once()
        time.sleep(max(5, args.interval))


if __name__ == "__main__":
    raise SystemExit(main())
