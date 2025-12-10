#!/usr/bin/env python3
"""
Agent Chat Integration Helper

Posts messages to Mattermost channels via incoming webhooks.
Gracefully handles chat service downtime (no-op if webhook fails).

Usage:
    from tools.agent_chat import post_message, post_start, post_completion, post_review

    # Task start (produces: "**CLI-009:** Alex is starting work - API Clients List Ordering")
    post_start("Alex", "CLI-009", "API Clients List Ordering", "feature/CLI-009")

    # Progress update (optional)
    post_message("Alex", "CLI-009", "Running tests on VM...", channel="agent-tasks")

    # Completion (produces: "**CLI-009:** Alex finished work")
    post_completion("Alex", "CLI-009", "1.5 hours", "a3b2c1d", "Jacob review")

    # Review verdict (produces: "**CLI-009:** Reviewed by Jacob: ✅ APPROVED")
    post_review("Jacob", "CLI-009", "APPROVED", "All checks passed")

CLI Usage:
    python tools/agent_chat.py Alex CLI-009 "Starting implementation"
    python tools/agent_chat.py Alex CLI-009 "Testing complete" completions
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
    emoji: str = ":wrench:"
) -> bool:
    """
    Post generic message to chat channel.

    Args:
        agent_name: Name of agent (Alex, Maya, etc.)
        task_id: Task ID (CLI-009, AOS-024, etc.)
        message: Message text
        channel: Channel name (agent-tasks, completions, reviews, ceo-updates)
        emoji: Icon emoji (default :wrench:)

    Returns:
        True if posted successfully, False otherwise
    """
    payload = {
        "username": agent_name,
        "icon_emoji": emoji,
        "text": f"**{task_id}:** {message}"
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
    estimated_hours: str = "1-2 hours"
) -> bool:
    """
    Post task start message to #agent-tasks.

    Example:
        post_start("Alex", "CLI-009", "API Clients List Ordering", "feature/CLI-009")
        # Produces: "**CLI-009:** Alex is starting work - API Clients List Ordering"
    """
    message = (
        f"**{agent_name}** is starting work - {task_description}\n"
        f"**Estimated:** {estimated_hours}\n"
        f"**Branch:** `{branch}`"
    )
    return post_message(agent_name, task_id, message, channel="agent-tasks", emoji=":arrows_counterclockwise:")

def post_completion(
    agent_name: str,
    task_id: str,
    duration: str,
    commit_hash: str,
    ready_for: str = "Jacob review"
) -> bool:
    """
    Post completion message to #completions.

    Example:
        post_completion("Alex", "CLI-009", "1.5 hours", "a3b2c1d", "Jacob review")
        # Produces: "**CLI-009:** Alex finished work"
    """
    message = (
        f"**{agent_name}** finished work\n"
        f"**Duration:** {duration}\n"
        f"**Commit:** `{commit_hash}`\n"
        f"**Ready for:** {ready_for}\n"
        f"**Details:** See TEAM_INBOX.md Messages TO Joe"
    )
    return post_message(agent_name, task_id, message, channel="completions", emoji=":white_check_mark:")

def post_review(
    agent_name: str,  # Usually "Jacob"
    task_id: str,
    verdict: str,  # "APPROVED" or "NEEDS_FIXES"
    details: str
) -> bool:
    """
    Post review verdict to #reviews.

    Example:
        post_review("Jacob", "CLI-009", "APPROVED", "All checks passed")
        # Produces: "**CLI-009:** Reviewed by Jacob: ✅ APPROVED"
    """
    emoji_map = {
        "APPROVED": "✅",
        "NEEDS_FIXES": "⚠️",
        "BLOCKED": "❌"
    }
    emoji_icon_map = {
        "APPROVED": ":white_check_mark:",
        "NEEDS_FIXES": ":warning:",
        "BLOCKED": ":x:"
    }

    emoji = emoji_map.get(verdict, "🔍")
    icon = emoji_icon_map.get(verdict, ":mag:")

    # Format: "**TASK-ID:** Reviewed by Jacob: ✅ APPROVED"
    # This makes it immediately clear which task is being reviewed
    message = (
        f"Reviewed by **{agent_name}**: {emoji} **{verdict}**\n"
        f"**Details:** {details}"
    )
    return post_message(agent_name, task_id, message, channel="reviews", emoji=icon)

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
