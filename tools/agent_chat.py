#!/usr/bin/env python3
"""
Agent Chat Integration Helper

Posts messages to Mattermost channels via incoming webhooks.
Gracefully handles chat service downtime (no-op if webhook fails).

CHANNEL CONSOLIDATION (CHAT-FIXES):
- All messages now go to #agent-tasks (primary monitoring channel)
- #completions and #reviews are deprecated (use agent-tasks)
- #ceo-updates remains for high-priority alerts

EMOJI CONVENTIONS:
- 🚀 Start/Spawn messages - Agent starting work
- ✅ Completion messages - Task complete
- 📋 Review messages - Review verdict
- 🟢 Unblock messages - Tasks now unblocked

Usage:
    from tools.agent_chat import post_message, post_start, post_completion, post_review, post_unblock

    # Task start (produces: "🚀 **CLI-009:** **Alex**: Starting work - API Clients...")
    post_start("Alex", "CLI-009", "API Clients List Ordering", "feature/CLI-009")

    # Progress update (optional)
    post_message("Alex", "CLI-009", "Running tests on VM...", channel="agent-tasks")

    # Completion - SELF-CONTAINED (produces: "✅ **CLI-009:** **Alex**: API Clients Ordering - Task complete")
    post_completion(
        "Alex", "CLI-009",
        "API Clients List Ordering",  # What was this about?
        "Added GET /clients?sort=name endpoint, tests passing",  # What was accomplished?
        "1.5 hours", "a3b2c1d",
        "Jacob review",
        "CLI-010 (Maya frontend)"  # What does this unblock?
    )

    # Review verdict (produces: "📋 **CLI-009:** **Jacob**: Review ✅ APPROVED")
    post_review("Jacob", "CLI-009", "APPROVED", "All checks passed")

    # Unblock notification (produces: "🟢 **UNBLOCKED:** CLI-010 (Maya)...")
    post_unblock("Joe", "CLI-010 (Maya), CLI-011 (Alex)", "CLI-009 approved")

CLI Usage:
    python tools/agent_chat.py Alex CLI-009 "Starting implementation"
    python tools/agent_chat.py Alex CLI-009 "Testing complete" agent-tasks
"""

import os
import sys
import json
import requests
from pathlib import Path
from typing import Optional, Literal

# Type for channel names
ChannelType = Literal["agent-tasks", "completions", "reviews", "ceo-updates"]

# Load webhook URLs from secrets
SECRETS_PATH = Path(__file__).parent.parent / ".." / "EISLAW System" / "secrets.local.json"

def _load_webhooks() -> dict:
    """Load Mattermost webhook URLs from secrets.json"""
    try:
        with open(SECRETS_PATH, 'r', encoding='utf-8') as f:
            secrets = json.load(f)
        return secrets.get("mattermost", {}).get("webhooks", {})
    except Exception as e:
        # Graceful degradation - chat unavailable, return empty dict
        print(f"[CHAT] Warning: Could not load Mattermost webhooks: {e}", file=sys.stderr)
        return {}

WEBHOOKS = _load_webhooks()

def _post_webhook(channel_key: str, payload: dict) -> bool:
    """
    Internal helper to POST to webhook URL.

    Returns True if successful, False if failed (graceful degradation).
    """
    webhook_url = WEBHOOKS.get(channel_key)
    if not webhook_url:
        # Chat not configured - this is OK, agent continues working
        return False

    try:
        response = requests.post(
            webhook_url,
            json=payload,
            timeout=5  # Don't block agent execution if chat is slow
        )
        response.raise_for_status()
        return True
    except Exception as e:
        # Log warning but don't fail agent execution
        print(f"[CHAT] Warning: Failed to post to {channel_key}: {e}", file=sys.stderr)
        return False

def post_message(
    agent_name: str,
    task_id: str,
    message: str,
    channel: ChannelType = "agent-tasks",
    emoji: str = ":wrench:",
    include_agent_prefix: bool = True
) -> bool:
    """
    Post generic message to chat channel.

    Args:
        agent_name: Name of agent (Alex, Maya, etc.)
        task_id: Task ID (CLI-009, AOS-024, etc.)
        message: Message text
        channel: Channel name (agent-tasks, completions, reviews, ceo-updates)
        emoji: Icon emoji (default :wrench:)
        include_agent_prefix: If True, prefix message with agent name (default True)

    Returns:
        True if posted successfully, False otherwise
    """
    # Always include agent name in message for visibility
    if include_agent_prefix and not message.startswith(f"**{agent_name}"):
        text = f"**{task_id}:** **{agent_name}**: {message}"
    else:
        text = f"**{task_id}:** {message}"

    payload = {
        "username": agent_name,
        "icon_emoji": emoji,
        "text": text
    }

    channel_key_map = {
        "agent-tasks": "agent_tasks",
        "completions": "completions",
        "reviews": "reviews",
        "ceo-updates": "ceo_updates"
    }

    channel_key = channel_key_map.get(channel, "agent_tasks")
    return _post_webhook(channel_key, payload)

def post_start(
    agent_name: str,
    task_id: str,
    task_description: str,
    branch: str,
    estimated_hours: str = "1-2 hours",
    depends_on: Optional[str] = None
) -> bool:
    """
    Post task start message to #agent-tasks with 🚀 emoji.

    Example:
        post_start("Alex", "CLI-009", "API Clients List Ordering", "feature/CLI-009")
        # Produces: "🚀 **CLI-009:** **Alex**: Starting work - API Clients List Ordering"

        post_start("Maya", "CLI-010", "Frontend UI", "feature/CLI-010", depends_on="CLI-009 (Alex)")
        # Shows dependency: waiting for Alex's CLI-009
    """
    message = (
        f"🚀 Starting work - {task_description}\n"
        f"**Estimated:** {estimated_hours}\n"
        f"**Branch:** `{branch}`"
    )

    if depends_on:
        message += f"\n**Depends on:** {depends_on}"

    return post_message(agent_name, task_id, message, channel="agent-tasks", emoji=":rocket:")

def post_completion(
    agent_name: str,
    task_id: str,
    task_description: str,
    outcome: str,
    duration: str,
    commit_hash: str,
    ready_for: str = "Jacob review",
    unblocks: Optional[str] = None
) -> bool:
    """
    Post completion message to #agent-tasks with ✅ emoji (consolidated channel).

    Messages are self-contained for CEO monitoring without needing TEAM_INBOX lookup.

    Args:
        agent_name: Agent name (Alex, Maya, etc.)
        task_id: Task ID (CLI-009, etc.)
        task_description: What was this task about? (1 sentence)
        outcome: What was accomplished? Key result or deliverable
        duration: Time spent (e.g., "1.5 hours")
        commit_hash: Git commit hash (short form)
        ready_for: What's next (default: "Jacob review")
        unblocks: Optional downstream tasks that are now unblocked

    Example:
        post_completion(
            "Alex", "CLI-009",
            "API Clients List Ordering",
            "Added GET /clients?sort=name endpoint, tests passing",
            "1.5 hours", "a3b2c1d",
            "Jacob review",
            "CLI-010 (Maya frontend), CLI-011 (Eli E2E tests)"
        )
        # Produces: "✅ **CLI-009:** **Alex**: API Clients List Ordering - Task complete"
    """
    message = (
        f"✅ **{task_description}** - Task complete\n"
        f"**Outcome:** {outcome}\n"
        f"**Duration:** {duration}\n"
        f"**Commit:** `{commit_hash}`\n"
        f"**Ready for:** {ready_for}"
    )

    if unblocks:
        message += f"\n🟢 **Unblocks:** {unblocks}"

    message += f"\n**Details:** See TEAM_INBOX.md Messages TO Joe"

    # Changed from "completions" to "agent-tasks" for channel consolidation
    return post_message(agent_name, task_id, message, channel="agent-tasks", emoji=":white_check_mark:")

def post_review(
    agent_name: str,  # Usually "Jacob"
    task_id: str,
    verdict: str,  # "APPROVED" or "NEEDS_FIXES"
    details: str,
    unblocks: Optional[str] = None
) -> bool:
    """
    Post review verdict to #agent-tasks with 📋 emoji (consolidated channel).

    Example:
        post_review("Jacob", "CLI-009", "APPROVED", "All checks passed")
        # Produces: "📋 **CLI-009:** **Jacob**: Review ✅ APPROVED"

        post_review("Jacob", "CLI-009", "APPROVED", "All checks passed", unblocks="CLI-010 (Maya), CLI-011 (Alex)")
        # Shows what tasks can now proceed with 🟢 unblock indicator
    """
    verdict_emoji_map = {
        "APPROVED": "✅",
        "NEEDS_FIXES": "⚠️",
        "BLOCKED": "❌"
    }

    verdict_emoji = verdict_emoji_map.get(verdict, "🔍")

    # Format: "📋 Review ✅ APPROVED"
    message = (
        f"📋 Review {verdict_emoji} **{verdict}**\n"
        f"**Details:** {details}"
    )

    if unblocks and verdict == "APPROVED":
        message += f"\n🟢 **Unblocks:** {unblocks}"

    # Post to agent-tasks only (consolidated channel per CEO request)
    return post_message(agent_name, task_id, message, channel="agent-tasks", emoji=":clipboard:")

def post_spawn(
    orchestrator: str,  # Usually "Joe"
    agent_name: str,
    task_id: str,
    task_description: str
) -> bool:
    """
    Post agent spawn notification to #agent-tasks (Joe only) with 🚀 emoji.

    Example:
        post_spawn("Joe", "Jacob", "CLI-009", "Review Alex's API changes")
        # Produces: "🚀 **CLI-009:** **Joe**: Spawning Jacob - Review Alex's API changes"
    """
    message = f"🚀 Spawning **{agent_name}** - {task_description}"
    return post_message(orchestrator, task_id, message, channel="agent-tasks", emoji=":rocket:")

def post_unblock(
    orchestrator: str,  # Usually "Joe"
    task_ids: str,
    reason: str
) -> bool:
    """
    Post unblock notification to #agent-tasks with 🟢 emoji.

    Example:
        post_unblock("Joe", "CLI-010 (Maya), CLI-011 (Alex)", "CLI-009 approved by Jacob")
        # Produces: "🟢 **UNBLOCKED:** CLI-010 (Maya), CLI-011 (Alex)"
    """
    message = f"🟢 **UNBLOCKED:** {task_ids}\n**Reason:** {reason}"
    return post_message(orchestrator, "UNBLOCK", message, channel="agent-tasks", emoji=":green_circle:", include_agent_prefix=False)


def post_ceo_alert(
    orchestrator: str,  # Usually "Joe"
    task_id: str,
    issue: str,
    impact: str,
    action_required: str,
    mention_channel: bool = True
) -> bool:
    """
    Post high-priority alert to #ceo-updates (for pipeline blockers, critical issues).

    Example:
        post_ceo_alert(
            "Joe",
            "AOS-029",
            "Choose rebase vs manual merge",
            "3 downstream tasks blocked",
            "CEO to provide guidance in TEAM_INBOX"
        )
    """
    mention = "@channel " if mention_channel else ""
    message = (
        f"{mention}🚨 **PIPELINE BLOCKED:** {task_id}\n"
        f"**Issue:** {issue}\n"
        f"**Impact:** {impact}\n"
        f"**Action Required:** {action_required}"
    )

    payload = {
        "username": orchestrator,
        "icon_emoji": ":rotating_light:",
        "text": message
    }

    return _post_webhook("ceo_updates", payload)

# CLI interface for testing
if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python agent_chat.py <agent_name> <task_id> <message> [channel]")
        print("Example: python agent_chat.py Alex CLI-009 'Starting implementation'")
        print("Channels: agent-tasks (default), completions, reviews, ceo-updates")
        sys.exit(1)

    agent = sys.argv[1]
    task = sys.argv[2]
    msg = sys.argv[3]
    channel = sys.argv[4] if len(sys.argv) > 4 else "agent-tasks"

    success = post_message(agent, task, msg, channel)
    if success:
        print(f"[CHAT] OK - Posted to {channel}: {msg}")
    else:
        print(f"[CHAT] WARNING - Failed to post (chat may be unavailable)")
