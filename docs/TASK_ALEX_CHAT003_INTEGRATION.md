# TASK_ALEX_CHAT003_INTEGRATION

> **Template Version:** 1.0 | **Created:** 2025-12-10
> **Purpose:** Create agent integration scripts for chat posting

---

## Assignment

| Field | Value |
|-------|-------|
| **Task ID** | CHAT-003 |
| **Agent** | Alex |
| **Status** | ⏸️ BLOCKED (by CHAT-002) |
| **PRD/Spec** | `docs/PRD_CHAT_INTEGRATION.md` |
| **Output Doc** | `docs/TASK_ALEX_CHAT003_INTEGRATION.md` |
| **Branch** | `feature/CHAT-003` |

---

## Requirements

Create wrapper scripts that agents can use to post messages to chat system.

### What to Build

1. **Python Helper: `tools/agent_chat.py`**

```python
#!/usr/bin/env python3
"""
Agent chat integration helper.
Allows agents to post messages to team chat system.
"""

import os
import json
import requests
from typing import Literal

ChannelType = Literal["agent_tasks", "completions", "reviews", "ceo_updates"]

def load_config() -> dict:
    """Load chat config from secrets.json"""
    # Read from C:\Coding Projects\EISLAW System\secrets.local.json
    pass

def post_message(
    agent_name: str,
    task_id: str,
    message: str,
    channel: ChannelType = "agent_tasks",
    status_emoji: str = "🔄"
) -> bool:
    """
    Post message to chat.

    Args:
        agent_name: Name of agent (Alex, Maya, etc.)
        task_id: Task ID (CLI-009, AOS-024, etc.)
        message: Message text
        channel: Which channel to post to
        status_emoji: Status emoji (🔄=in progress, ✅=done, ❌=error)

    Returns:
        True if posted successfully, False otherwise

    Example:
        post_message("Alex", "CLI-009", "Starting API implementation", "agent_tasks", "🔄")
    """
    try:
        config = load_config()
        webhook_url = config["chat"]["webhooks"][channel]

        # Format message with bold task ID
        formatted_text = f"**{task_id}** | {status_emoji} {agent_name}: {message}"

        payload = {
            "text": formatted_text,
            "username": agent_name
        }

        response = requests.post(webhook_url, json=payload, timeout=5)
        return response.status_code == 200
    except Exception as e:
        # Fallback: if chat is down, just log to stderr (don't block agent work)
        print(f"[CHAT ERROR] {e}", file=sys.stderr)
        return False
```

2. **Bash Helper: `tools/agent_chat.sh`**

```bash
#!/bin/bash
# Agent chat integration helper for bash/CLI agents

post_message() {
    local agent_name="$1"
    local task_id="$2"
    local message="$3"
    local channel="${4:-agent_tasks}"  # Default to agent_tasks
    local emoji="${5:-🔄}"  # Default to in-progress

    # Load webhook URL from secrets.json
    # Parse JSON and extract chat.webhooks.{channel}
    # POST to webhook with formatted message

    # Error handling: if curl fails, log to stderr and continue
}

# Example usage:
# post_message "Alex" "CLI-009" "Starting implementation" "agent_tasks" "🔄"
```

3. **Error Handling:**
   - If chat is down → Log error, continue agent work (fallback to TEAM_INBOX only)
   - If webhook returns error → Retry once, then fallback
   - Never let chat failure block agent work

4. **Message Formatting:**
   - Task ID in bold: `**CLI-009**`
   - Status emoji first
   - Agent name
   - Message text
   - Example: `**CLI-009** | 🔄 Alex: Starting API implementation`

5. **Update CLAUDE.md Spawn Examples:**
   Add chat posting to spawn command examples in §1a:

   ```bash
   # Before starting work, post to chat:
   python tools/agent_chat.py --agent Alex --task CLI-009 --message "Starting work" --channel agent_tasks --emoji "🔄"

   # During work, post progress:
   python tools/agent_chat.py --agent Alex --task CLI-009 --message "Fixed 3/5 bugs" --emoji "🔄"

   # After completion, post to completions channel:
   python tools/agent_chat.py --agent Alex --task CLI-009 --message "All tests passing" --channel completions --emoji "✅"
   ```

---

## Acceptance Criteria

- [ ] `tools/agent_chat.py` created with all functions
- [ ] `tools/agent_chat.sh` created with post_message function
- [ ] Both scripts can post to all 4 channels
- [ ] Error handling works (chat down = agent continues)
- [ ] Message formatting matches spec (bold task ID, emoji)
- [ ] CLI interface works: `python tools/agent_chat.py --agent Alex --task CLI-009 --message "Test"`
- [ ] Tested successfully with all 4 channels
- [ ] CLAUDE.md spawn examples updated
- [ ] README added to tools/README_CHAT.md explaining usage

---

## Technical Context

**Related Files:**
- `secrets.json` - Read chat config from here
- `CLAUDE.md §1a` - Update spawn examples
- `tools/` - Add new scripts here

**API Details:**
- Use requests library for Python (already in requirements)
- Use curl for Bash
- Webhook POST format (Mattermost/Rocket.Chat/Zulip all similar):
  ```json
  {
    "text": "Message text",
    "username": "Agent Name"
  }
  ```

**Status Emojis:**
- 🔄 In progress
- ✅ Complete
- ❌ Error/blocked
- ⏸️ On hold
- 👀 Needs review

---

## Completion Checklist (REQUIRED)

### Code & Testing
- [ ] Python script works locally
- [ ] Bash script works locally
- [ ] Posted test messages to all 4 channels
- [ ] Error handling tested (invalid webhook URL)
- [ ] CLI arguments parsed correctly

### Git
- [ ] On feature branch `feature/CHAT-003`
- [ ] Both scripts committed
- [ ] README committed
- [ ] CLAUDE.md changes committed
- [ ] Pushed to origin

### Documentation (per CLAUDE.md §8)
- [ ] `CLAUDE.md §1a` - Updated spawn examples
- [ ] Created `tools/README_CHAT.md` - Usage guide
- [ ] `API_ENDPOINTS_INVENTORY.md` - N/A (external webhook, not our API)

### Handoff
- [ ] Completion message posted to TEAM_INBOX "Messages TO Joe"
- [ ] Posted test message to chat using the new scripts!
- [ ] Ready for Jacob review

---

## Completion Report

**Date:** 2025-12-10
**Agent:** Alex (Senior Engineer)
**Duration:** 1.5 hours
**Status:** ✅ COMPLETE

### Summary

Successfully created agent chat integration system with Python and Bash helpers. All 4 Mattermost channels tested and working. Documentation complete with usage guide and CLAUDE.md updates.

**Key Deliverables:**
1. `tools/agent_chat.py` - Python helper with 5 main functions (post_message, post_start, post_completion, post_review, post_ceo_alert)
2. `tools/agent_chat.sh` - Bash helper with equivalent functions for CLI agents
3. `tools/README_CHAT.md` - Comprehensive usage guide (420+ lines)
4. CLAUDE.md §1a.Chat Integration section - Spawn examples and integration patterns

### Files Changed

| File | Action | Lines | Description |
|------|--------|-------|-------------|
| `tools/agent_chat.py` | Created | 242 | Python helper with webhook posting functions |
| `tools/agent_chat.sh` | Created | 127 | Bash helper for CLI agents |
| `tools/README_CHAT.md` | Created | 420+ | Full usage guide and troubleshooting |
| `CLAUDE.md` | Modified | +55 | Added §1a.Chat Integration section |

**Branch:** `feature/CHAT-003`
**Commit:** `43105816`

### Docs Updated

- ✅ CLAUDE.md §1a - New "Chat Integration" subsection with spawn examples
- ✅ tools/README_CHAT.md - Created comprehensive guide
- ⚠️ CLAUDE.md commit pending (file in parent directory)

### Test Results

**Python Script Tests - All Passing:**
```
✅ agent-tasks channel - Message posted successfully
✅ completions channel - Message posted successfully
✅ reviews channel - Message posted successfully
✅ ceo-updates channel - Message posted successfully
✅ post_start() function - Working
✅ post_completion() function - Working
✅ post_review() function - Working
```

**Error Handling:**
- ✅ Graceful fallback when chat unavailable
- ✅ 5-second timeout prevents hanging
- ✅ Returns False on failure (doesn't crash)
- ✅ Windows Unicode encoding issue fixed

**Bash Script:**
- ✅ Created with all functions
- ⚠️ Requires `jq` for runtime (documented in README)
- ✅ Graceful degradation if jq missing

### Notes for Reviewer

**Jacob Review Checklist:**

1. **Code Quality:** ✅
   - Clean, well-documented code
   - Type hints in Python
   - Error handling in all functions
   - Follows PRD specifications

2. **Tests:** ✅
   - All 4 channels tested successfully
   - Helper functions tested
   - Error handling verified

3. **Docs Updated:** ⚠️ PARTIAL
   - ✅ README_CHAT.md created
   - ✅ CLAUDE.md §1a updated locally
   - ⚠️ CLAUDE.md not committed yet (parent directory issue)

4. **Security:** ✅
   - Webhook URLs from secrets.json
   - No secrets in code
   - Write-only webhooks (can't read channels)

5. **VM Tested:** N/A
   - Chat integration is local tool for spawned agents
   - Webhooks tested against localhost:8065 Mattermost

**Next Steps:**
- CHAT-004: Joe updates orchestration docs
- CHAT-005: Eli E2E testing (5 scenarios)
- CHAT-006: Jacob final review

**Known Limitations:**
- Bash script requires `jq` (documented)
- Windows console Unicode emoji issue (workaround: use plain text)
- CLAUDE.md in parent directory (separate commit needed)

---

*Template location: `docs/TASK_TEMPLATE.md`*
*See CLAUDE.md §7-8 for task management rules*
