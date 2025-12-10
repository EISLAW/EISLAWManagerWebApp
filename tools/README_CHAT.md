# Agent Chat Integration - Usage Guide

## Overview

The agent chat integration allows spawned CLI agents to post real-time updates to Mattermost channels for CEO visibility, while maintaining TEAM_INBOX as the canonical source of truth.

**Channels:**
- `#agent-tasks` - Task start + progress updates
- `#completions` - Completion announcements
- `#reviews` - Jacob's review verdicts
- `#ceo-updates` - High-priority alerts

**Principle:** Chat is for real-time visibility. TEAM_INBOX is for structured records.

---

## Python Helper (`tools/agent_chat.py`)

### Installation

No installation needed - `requests` library is already in project requirements.

### Usage

#### Import in Python Scripts

```python
from tools.agent_chat import post_message, post_start, post_completion, post_review
```

#### Task Start

```python
post_start(
    agent_name="Alex",
    task_id="CLI-009",
    task_description="API Clients List Ordering",
    branch="feature/CLI-009",
    estimated_hours="1-2 hours"
)
```

**Posts to:** `#agent-tasks`

**Example output:**
```
🔄 **Starting:** CLI-009 - API Clients List Ordering
**Estimated:** 1-2 hours
**Branch:** `feature/CLI-009`
```

#### Progress Update (Optional)

```python
post_message(
    agent_name="Alex",
    task_id="CLI-009",
    message="Running tests on VM...",
    channel="agent-tasks"
)
```

**Posts to:** `#agent-tasks`

#### Completion

```python
post_completion(
    agent_name="Alex",
    task_id="CLI-009",
    duration="1.5 hours",
    commit_hash="a3b2c1d",
    ready_for="Jacob review"
)
```

**Posts to:** `#completions`

**Example output:**
```
✅ **Completed:** CLI-009
**Duration:** 1.5 hours
**Commit:** `a3b2c1d`
**Ready for:** Jacob review
**Details:** See TEAM_INBOX.md Messages TO Joe
```

#### Review Verdict

```python
post_review(
    agent_name="Jacob",
    task_id="CLI-009",
    verdict="APPROVED",  # or "NEEDS_FIXES" or "BLOCKED"
    details="All checks passed"
)
```

**Posts to:** `#reviews`

**Example output:**
```
**CLI-009:** Reviewed by Jacob: ✅ APPROVED
**Details:** All checks passed
```

#### CEO Alert

```python
from tools.agent_chat import post_ceo_alert

post_ceo_alert(
    orchestrator="Joe",
    task_id="AOS-029",
    issue="Choose rebase vs manual merge",
    impact="3 downstream tasks blocked",
    action_required="CEO to provide guidance in TEAM_INBOX",
    mention_channel=True  # Sends @channel mention
)
```

**Posts to:** `#ceo-updates`

#### CLI Usage

```bash
# Basic message
python tools/agent_chat.py Alex CLI-009 "Starting implementation"

# Specify channel
python tools/agent_chat.py Alex CLI-009 "Tests passing" completions
```

**Channels:** `agent-tasks` (default), `completions`, `reviews`, `ceo-updates`

---

## Bash Helper (`tools/agent_chat.sh`)

### Prerequisites

**Required:** `jq` (JSON parser)

Install jq:
```bash
# Windows (via Chocolatey)
choco install jq

# WSL/Linux
sudo apt install jq

# macOS
brew install jq
```

### Usage

#### Source the Script

```bash
source tools/agent_chat.sh
```

#### Task Start

```bash
agent_chat_start "Alex" "CLI-009" "API ordering" "feature/CLI-009" "1-2 hours"
```

#### Progress Update

```bash
agent_chat_message "Alex" "CLI-009" "Running tests..." "agent-tasks"
```

#### Completion

```bash
agent_chat_complete "Alex" "CLI-009" "1.5 hours" "a3b2c1d" "Jacob review"
```

#### Review Verdict

```bash
agent_chat_review "Jacob" "CLI-009" "APPROVED" "All checks passed"
```

#### CEO Alert

```bash
agent_chat_ceo_alert "Joe" "AOS-029" "Decision needed" "3 tasks blocked" "See TEAM_INBOX"
```

---

## Error Handling

**Key Principle:** Chat downtime MUST NOT break agent execution.

### How It Works

- All webhook POST requests have 5-second timeout
- Failed requests return `False` (Python) or `1` (Bash)
- Agents log warning but continue execution
- TEAM_INBOX updates always happen (chat is additive)

### Example Flow

```python
# Agent code
post_start("Alex", "CLI-009", "API ordering", "feature/CLI-009")
# Chat is down → returns False → warning logged → agent continues

# ... implementation work happens ...

# Chat comes back up
post_completion("Alex", "CLI-009", "1.5 hours", "a3b2c1d")
# Chat is up → returns True → completion message posted
```

---

## Configuration

Webhook URLs are stored in `secrets.local.json`:

```json
{
  "mattermost": {
    "base_url": "http://localhost:8065",
    "webhooks": {
      "agent_tasks": "http://localhost:8065/hooks/xxx-agent-tasks",
      "completions": "http://localhost:8065/hooks/xxx-completions",
      "reviews": "http://localhost:8065/hooks/xxx-reviews",
      "ceo_updates": "http://localhost:8065/hooks/xxx-ceo-updates"
    }
  }
}
```

**Security:** `secrets.local.json` is git-ignored. Webhook URLs are write-only (cannot read channels).

---

## Spawn Command Integration

### Claude CLI Agents

```bash
# Before starting work, post to chat:
claude -p "You are Alex. Find task CLI-009 in TEAM_INBOX.
Before starting, run: python tools/agent_chat.py Alex CLI-009 'Starting work' agent-tasks
During work, post progress updates as needed.
After completion, run: python tools/agent_chat.py Alex CLI-009 'Complete' completions
Then update TEAM_INBOX Messages TO Joe section." \
--tools default --dangerously-skip-permissions
```

### Codex CLI Agents

```bash
codex exec --full-auto "You are Alex. Task CLI-009. Post to chat via bash:
source tools/agent_chat.sh && agent_chat_start 'Alex' 'CLI-009' 'API work' 'feature/CLI-009'"
```

---

## Testing

### Test All Channels

```bash
# Agent tasks
python tools/agent_chat.py Alex TEST-001 "Test agent-tasks" agent-tasks

# Completions
python tools/agent_chat.py Alex TEST-001 "Test completions" completions

# Reviews
python tools/agent_chat.py Jacob TEST-001 "Test reviews" reviews

# CEO updates
python tools/agent_chat.py Joe TEST-001 "Test ceo-updates" ceo-updates
```

### Test Functions

```bash
# Task start
python -c "from tools.agent_chat import post_start; post_start('Alex', 'TEST-001', 'Test task', 'feature/TEST-001')"

# Completion
python -c "from tools.agent_chat import post_completion; post_completion('Alex', 'TEST-001', '1 hour', 'abc123', 'Testing')"

# Review
python -c "from tools.agent_chat import post_review; post_review('Jacob', 'TEST-001', 'APPROVED', 'Looks good')"
```

---

## Troubleshooting

### Messages Not Appearing

1. **Check Mattermost is running:**
   ```bash
   curl http://localhost:8065
   ```

2. **Verify webhook URLs:**
   - Open `secrets.local.json`
   - Ensure webhook URLs are valid
   - Test webhook with curl:
   ```bash
   curl -X POST http://localhost:8065/hooks/xxx \
     -H 'Content-Type: application/json' \
     -d '{"text":"Test","username":"Test"}'
   ```

3. **Check Python can access secrets:**
   ```python
   from tools.agent_chat import WEBHOOKS
   print(WEBHOOKS)
   ```

### Unicode Errors on Windows

If you see `UnicodeEncodeError`, this is Windows console encoding issue. The script **still works** - messages are posted to Mattermost successfully. The error only affects console output.

**Workaround:** Ignore the error or redirect stderr:
```bash
python tools/agent_chat.py Alex TEST "Test" 2>nul
```

### Bash Script Not Working

**Likely cause:** `jq` not installed.

**Solution:**
```bash
# Check jq
jq --version

# Install if missing (Windows)
choco install jq
```

---

## Best Practices

### When to Post

| Event | Post to Chat? | Update TEAM_INBOX? |
|-------|--------------|-------------------|
| **Task assigned** | ❌ No | ✅ Yes (Joe writes task) |
| **Task started** | ✅ Yes (#agent-tasks) | ❌ No (not needed) |
| **Progress update** | ⚠️ Optional (#agent-tasks) | ❌ No (clutters TEAM_INBOX) |
| **Completed** | ✅ Yes (#completions) | ✅ Yes (Messages TO Joe) |
| **Review verdict** | ✅ Yes (#reviews) | ✅ Yes (Messages TO Joe) |

### Message Formatting

- Keep messages concise (1-3 lines max)
- Use markdown for emphasis: `**bold**`, `` `code` ``
- Include task ID in every message
- Use appropriate emojis for visual scanning

### Performance

- Webhook calls are async (non-blocking)
- 5-second timeout ensures no hanging
- Failed posts don't break agent execution
- Typical latency: <100ms

---

## See Also

- **PRD:** `docs/PRD_CHAT_INTEGRATION.md` - Full architecture & design
- **CLAUDE.md §1a:** Agent orchestration & spawn commands
- **TEAM_INBOX:** Canonical task tracking
- **DEV_PORTS:** Mattermost port configuration (8065)

---

**Last Updated:** 2025-12-10 (CHAT-003)
