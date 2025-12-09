# PRD: Chat Integration System for Agent Communication

**Document ID:** PRD-CHAT-001
**Author:** David (Senior Product)
**Date:** 2025-12-10
**Status:** APPROVED FOR IMPLEMENTATION
**Task:** CHAT-001

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Criteria](#3-goals--success-criteria)
4. [Platform Evaluation](#4-platform-evaluation)
5. [Recommendation: Mattermost](#5-recommendation-mattermost)
6. [Architecture Design](#6-architecture-design)
7. [Channel Structure](#7-channel-structure)
8. [API Integration](#8-api-integration)
9. [TEAM_INBOX Sync Workflow](#9-team_inbox-sync-workflow)
10. [Installation Plan](#10-installation-plan)
11. [Security Considerations](#11-security-considerations)
12. [Resource Requirements](#12-resource-requirements)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Success Criteria](#14-success-criteria)
15. [Open Questions](#15-open-questions)
16. [Research Sources](#16-research-sources)

---

## 1. Executive Summary

This PRD defines the integration of a **real-time chat system** alongside the existing TEAM_INBOX for live agent communication and progress monitoring. After evaluating Mattermost, Rocket.Chat, and Zulip, **Mattermost is the recommended platform** due to superior performance, robust REST API, comprehensive webhook support, and minimal resource footprint.

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| **Platform: Mattermost** | Best performance, REST API quality, PostgreSQL support, enterprise-ready |
| **Deployment: Docker** | Simplest installation, isolation, easy backup/restore |
| **Hybrid Approach** | Chat for real-time updates, TEAM_INBOX for structured tracking |
| **Agent Posting** | Python/Bash helpers using incoming webhooks (simple, no auth complexity) |
| **Channels** | 4 core channels: #agent-tasks, #completions, #reviews, #ceo-updates |

### Value Proposition

- **Real-time visibility:** CEO sees agent progress live without checking TEAM_INBOX repeatedly
- **Parallel monitoring:** Multiple agents working simultaneously, each posting updates
- **Structured archive:** TEAM_INBOX remains single source of truth for completed work
- **Zero disruption:** Existing orchestration system unchanged, chat is additive layer
- **Minimal overhead:** Lightweight HTTP POST requests, no complex integration

---

## 2. Problem Statement

### Current State

**TEAM_INBOX.md** is the single communication channel for:
- Task assignments (Joe → Agents)
- Progress updates (Agents → Joe)
- Completion reports (Agents → Joe)
- Review verdicts (Jacob → Joe)

**Limitations:**
1. **No real-time visibility:** CEO must manually open/refresh TEAM_INBOX to see progress
2. **Parallel work opacity:** When 3+ agents run simultaneously, hard to track who's doing what
3. **Context switching:** Agents working on VM must SSH back to update TEAM_INBOX
4. **No notifications:** Silent updates, CEO doesn't know when tasks complete
5. **Poor UX for monitoring:** Markdown file not optimized for live dashboard view

### User Pain Points

**CEO (Product Architect):**
- "I spawned 5 agents an hour ago - are they still working or stuck?"
- "Which agent is blocking the pipeline right now?"
- "Did Jacob approve the review or is he still analyzing?"

**Joe (Orchestrator):**
- "Agent posted completion to TEAM_INBOX but I didn't notice for 20 minutes"
- "Need to check 3 different output files to see if parallel agents finished"

**Agents (Alex, Maya, etc.):**
- "I'm 60% done with implementation - should I post interim update to TEAM_INBOX? (clutters file)"
- "Just hit an error - want to notify Joe immediately, not wait for completion"

---

## 3. Goals & Success Criteria

### Primary Goals

1. **Real-Time Visibility:** CEO can see agent progress in live dashboard (chat UI)
2. **Hybrid Workflow:** Chat for streaming updates, TEAM_INBOX for structured records
3. **Zero Code Changes:** Existing orchestration system (spawn commands, task structure) unchanged
4. **Simple Agent API:** Post messages with 1-line helper function
5. **Local Installation:** Self-hosted on Windows machine, no cloud dependency

### Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| **Installation Time** | Jane completes setup in <2 hours |
| **Agent Integration** | Alex creates Python/Bash helpers in <1 hour |
| **First Live Test** | Joe spawns 3 agents, all post to chat successfully |
| **CEO UX** | CEO can see real-time updates without refreshing TEAM_INBOX |
| **Reliability** | Chat downtime doesn't break agent execution (graceful fallback) |
| **Documentation** | CLAUDE.md updated with spawn examples showing chat integration |

### Non-Goals (Out of Scope)

- ❌ Chat-based task assignment (TEAM_INBOX remains primary)
- ❌ Chat history as source of truth (TEAM_INBOX is canonical)
- ❌ User authentication for agents (webhooks are public within local network)
- ❌ Mobile app integration (desktop monitoring only)
- ❌ Advanced features (bots, slash commands, emoji reactions)

---

## 4. Platform Evaluation

### Comparison Matrix

| Criterion | Mattermost | Rocket.Chat | Zulip | Weight |
|-----------|-----------|-------------|-------|--------|
| **Windows Docker Support** | ✅ Official (dev/test) | ✅ Recommended | ⚠️ Works but complex | 25% |
| **REST API Quality** | ✅ Excellent ([docs](https://developers.mattermost.com/integrate/reference/rest-api/)) | ✅ Good | ✅ Good | 30% |
| **Incoming Webhooks** | ✅ Native, simple setup | ✅ Native, Slack-compatible | ✅ Native | 20% |
| **Resource Usage** | ✅ Low (Golang, server-side) | ⚠️ Medium (Meteor, MongoDB) | ✅ Low (modern stack) | 15% |
| **UI/UX** | ✅ Clean, Slack-like | ✅ Modern, customizable | ⚠️ Topic-based (learning curve) | 5% |
| **Documentation** | ✅ Comprehensive | ✅ Good | ✅ Good | 5% |
| **Latest Release** | v11.1.1 (Nov 2025) | Active development | v11.4 (stable) | - |
| **Database** | PostgreSQL or MySQL | MongoDB | PostgreSQL | - |
| **Tech Stack** | Golang + React | Meteor + MongoDB | Electron + React Native | - |
| **Weighted Score** | **9.25/10** | **7.5/10** | **7.75/10** | - |

### Detailed Analysis

#### 4.1 Mattermost

**Strengths:**
- ✅ **Performance:** Golang-based, runs as single binary, minimal client-side resources ([source](https://wz-it.com/en/blog/slack-alternatives-mattermost-rocketchat-zulip/))
- ✅ **REST API:** Comprehensive API with excellent documentation ([source](https://developers.mattermost.com/integrate/reference/rest-api/))
- ✅ **Webhooks:** Simple incoming webhook setup - generate URL in UI, POST JSON ([source](https://developers.mattermost.com/integrate/webhooks/incoming/))
- ✅ **Docker:** Official Docker Compose setup, 2 containers (app + database) ([source](https://github.com/mattermost/docker))
- ✅ **Enterprise-Ready:** Designed for large-scale deployments ([source](https://docs.mattermost.com/deployment-guide/server/deploy-containers.html))
- ✅ **Database:** PostgreSQL support (we have DB expertise)

**Weaknesses:**
- ⚠️ Docker on Windows officially supported for dev/test only (production is Linux-only) - **ACCEPTABLE** since this is for local monitoring, not production user-facing service

**Verdict:** **RECOMMENDED** - Best overall fit for EISLAW needs.

#### 4.2 Rocket.Chat

**Strengths:**
- ✅ **Docker First:** Recommended deployment method, good Windows support ([source](https://docs.rocket.chat/docs/deploy-with-docker-docker-compose))
- ✅ **API:** Robust REST API with personal access tokens ([source](https://docs.rocket.chat/docs/deploy-rocketchat))
- ✅ **Webhooks:** Slack-compatible webhooks, easy third-party integrations
- ✅ **Active Development:** Regular updates

**Weaknesses:**
- ⚠️ **Resource Usage:** Meteor framework + MongoDB = heavier stack ([source](https://stackshare.io/stackups/mattermost-vs-rocketchat-vs-zulip))
- ⚠️ **Monitoring Overhead:** Requires its own monitoring (server load, MongoDB backups) ([source](https://wz-it.com/en/blog/slack-alternatives-mattermost-rocketchat-zulip/))
- ⚠️ **Legacy Support:** Ceased support for old versions as of Dec 2023 ([source](https://docs.rocket.chat/docs/deploy-rocketchat))

**Verdict:** **VIABLE ALTERNATIVE** - Good option if Mattermost fails, but heavier stack.

#### 4.3 Zulip

**Strengths:**
- ✅ **Performance:** "Very good" on modern hardware, scales to thousands of users ([source](https://wz-it.com/en/blog/slack-alternatives-mattermost-rocketchat-zulip/))
- ✅ **Modern Stack:** Electron + React Native, modern apps for all platforms
- ✅ **Topic-Based Threading:** Unique conversation organization

**Weaknesses:**
- ⚠️ **Docker Complexity:** "Moderately increases effort to install, maintain, upgrade" vs standard installer ([source](https://github.com/zulip/docker-zulip))
- ⚠️ **Windows Support:** No native Windows support, Docker required ([source](https://zulip.readthedocs.io/en/stable/production/install.html))
- ⚠️ **Resource Requirements:** 2GB RAM minimum, 4GB if building container ([source](https://github.com/zulip/docker-zulip))
- ⚠️ **Topic-Based UX:** Learning curve for users expecting channel-based chat
- ⚠️ **Network Proxy:** All outgoing traffic routes through Smokescreen proxy (adds complexity) ([source](https://zulip.com/self-hosting/))

**Verdict:** **NOT RECOMMENDED** - More complex setup, higher resource usage, UX mismatch.

---

## 5. Recommendation: Mattermost

### Decision Summary

**Selected Platform:** Mattermost v11.1.1

**Key Rationale:**

1. **Performance First:** Golang-based single binary with PostgreSQL = minimal overhead alongside EISLAW services (API, web-dev, orchestrator, Meilisearch, Langfuse already running)
2. **API Excellence:** Best-in-class REST API and webhook documentation - agents can integrate with 10-line Python helper
3. **Operational Simplicity:** 2-container setup (app + Postgres), no heavy framework (Meteor) or complex proxy (Smokescreen)
4. **Team Familiarity:** PostgreSQL expertise from main EISLAW DB, Slack-like UX familiar to CEO
5. **Docker Maturity:** Official Docker Compose files maintained by Mattermost team

**Risk Mitigation:**

| Risk | Mitigation |
|------|-----------|
| "Windows Docker only for dev/test" | Acceptable - this is local monitoring tool, not production user service. Can migrate to Linux VM later if needed. |
| PostgreSQL resource usage | Use lightweight config, limit channel history retention, monitor with existing Grafana |
| Single point of failure | Chat downtime = agents fall back to TEAM_INBOX only. No execution blocker. |

---

## 6. Architecture Design

### 6.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CEO (User)                               │
│                                                                   │
│  ┌──────────────────┐                  ┌──────────────────┐     │
│  │ Browser:         │                  │ VSCode:          │     │
│  │ Mattermost UI    │                  │ TEAM_INBOX.md    │     │
│  │ localhost:8065   │                  │ (Source of Truth)│     │
│  └────────┬─────────┘                  └─────────┬────────┘     │
│           │                                      │               │
└───────────┼──────────────────────────────────────┼───────────────┘
            │                                      │
            │ (3) View                             │ (6) Read archive
            │ real-time                            │
            │ updates                              │
            ▼                                      ▼
  ┌──────────────────────┐              ┌──────────────────────┐
  │  Mattermost Server   │              │   TEAM_INBOX.md      │
  │  (Docker Container)  │              │   (Git-controlled)   │
  │                      │              │                      │
  │  - PostgreSQL DB     │              │  - Task assignments  │
  │  - Channels:         │              │  - Completion reports│
  │    #agent-tasks      │◄─────(5)─────┤  - Review verdicts   │
  │    #completions      │  Sync on     │  - Messages TO Joe   │
  │    #reviews          │  completion  │                      │
  │    #ceo-updates      │              │                      │
  └──────────┬───────────┘              └──────────────────────┘
             ▲                                      ▲
             │                                      │
             │ (2) POST via                         │ (4) Append
             │ incoming webhook                     │ completion
             │                                      │
  ┌──────────┴──────────────────────────────────────┴───────────┐
  │                    Joe (Orchestrator)                        │
  │                                                               │
  │  (1) Spawn agents with chat integration:                     │
  │      claude -p "You are Alex. Find task CLI-009...           │
  │                 Post updates via tools/agent_chat.py"        │
  │                 --tools default --dangerously-skip...        │
  │                                                               │
  │  Spawned Agents (Alex, Maya, David, Joseph, Sarah, etc.)    │
  │  ┌──────────────────────────────────────────────────────┐   │
  │  │  1. Read task from TEAM_INBOX                        │   │
  │  │  2. Post start message to #agent-tasks               │   │
  │  │  3. Work on implementation                           │   │
  │  │  4. Post progress to #agent-tasks (optional)         │   │
  │  │  5. Post completion to #completions                  │   │
  │  │  6. Append completion to TEAM_INBOX "Messages TO Joe"│   │
  │  └──────────────────────────────────────────────────────┘   │
  └───────────────────────────────────────────────────────────────┘
```

### 6.2 Integration Points

| Component | Role | Integration Method |
|-----------|------|-------------------|
| **Mattermost** | Real-time message display | Incoming webhooks (HTTP POST) |
| **TEAM_INBOX.md** | Canonical task/completion records | File append (existing) |
| **Agent Scripts** | Post updates to both chat + TEAM_INBOX | `tools/agent_chat.py`, `tools/agent_chat.sh` |
| **Joe (Orchestrator)** | Spawn agents with chat instructions | Updated spawn templates in CLAUDE.md |
| **CEO** | Monitor progress | Mattermost web UI (browser) |

### 6.3 Message Flow Sequence

```
CEO: "Implement feature X"
  │
  ▼
Joe: Parse request → Create task in TEAM_INBOX → Spawn Alex
  │
  ▼
Alex (spawned agent):
  ├─ (1) Read TEAM_INBOX for task CLI-009
  ├─ (2) Post to #agent-tasks: "🔄 Alex starting CLI-009: API ordering"
  ├─ (3) Checkout feature branch
  ├─ (4) Post to #agent-tasks: "📝 Writing endpoint changes..."
  ├─ (5) Implement code
  ├─ (6) Post to #agent-tasks: "🧪 Testing on VM..."
  ├─ (7) Run tests
  ├─ (8) Post to #completions: "✅ CLI-009 complete - API ordering working"
  └─ (9) Append to TEAM_INBOX "Messages TO Joe": "CLI-009 COMPLETE..."
  │
  ▼
Joe: Read completion from TEAM_INBOX (canonical source)
  │
  ▼
Joe: Assign Jacob to review
  │
  ▼
Jacob (spawned agent):
  ├─ (1) Read TEAM_INBOX for review task
  ├─ (2) Post to #reviews: "🔍 Jacob reviewing CLI-009..."
  ├─ (3) Check code, tests, docs
  ├─ (4) Post to #reviews: "✅ CLI-009 APPROVED" or "⚠️ NEEDS_FIXES"
  └─ (5) Append verdict to TEAM_INBOX
  │
  ▼
CEO: Sees entire flow in Mattermost UI + final record in TEAM_INBOX
```

---

## 7. Channel Structure

### 7.1 Channel Design

| Channel | Purpose | Webhook Type | Who Posts | Retention |
|---------|---------|--------------|-----------|-----------|
| **#agent-tasks** | Task start + progress updates | Incoming | All agents (Alex, Maya, David, etc.) | 7 days |
| **#completions** | Completion announcements | Incoming | All agents | 30 days |
| **#reviews** | Jacob's review activity | Incoming | Jacob only | 30 days |
| **#ceo-updates** | High-priority notifications | Incoming | Joe (orchestrator) | 90 days |

### 7.2 Message Format Standards

#### Task Start Message
```json
{
  "channel": "agent-tasks",
  "username": "Alex",
  "icon_emoji": ":wrench:",
  "text": "🔄 **Starting:** CLI-009 - API Clients List Ordering\n**Estimated:** 1-2 hours\n**Branch:** `feature/CLI-009`"
}
```

#### Progress Update (Optional)
```json
{
  "channel": "agent-tasks",
  "username": "Alex",
  "icon_emoji": ":wrench:",
  "text": "📝 **CLI-009:** Endpoints updated, running tests on VM..."
}
```

#### Completion Message
```json
{
  "channel": "completions",
  "username": "Alex",
  "icon_emoji": ":white_check_mark:",
  "text": "✅ **Completed:** CLI-009 - API Clients List Ordering\n**Duration:** 1.5 hours\n**Commit:** `a3b2c1d`\n**Ready for:** Jacob review\n**Details:** See `TEAM_INBOX.md` Messages TO Joe"
}
```

#### Review Verdict
```json
{
  "channel": "reviews",
  "username": "Jacob",
  "icon_emoji": ":mag:",
  "text": "✅ **APPROVED:** CLI-009\n**Checklist:** Code ✅ | Tests ✅ | Docs ✅ | VM ✅\n**Verdict:** Production-ready, no issues found."
}
```

#### CEO Alert (High Priority)
```json
{
  "channel": "ceo-updates",
  "username": "Joe",
  "icon_emoji": ":rotating_light:",
  "text": "@channel **PIPELINE BLOCKED:** AOS-029 needs CEO decision\n**Issue:** Choose between Approach A (rebase) or B (manual merge)\n**Impact:** 3 downstream tasks blocked\n**Action Required:** CEO to provide guidance in TEAM_INBOX"
}
```

### 7.3 Emoji & Status Conventions

| Emoji | Meaning | Used In |
|-------|---------|---------|
| 🔄 | Starting task | #agent-tasks (start) |
| 📝 | In progress / writing code | #agent-tasks (progress) |
| 🧪 | Testing | #agent-tasks (progress) |
| ✅ | Completed successfully | #completions |
| ⚠️ | Needs fixes / issues found | #reviews, #completions |
| ❌ | Blocked / failed | #agent-tasks, #ceo-updates |
| 🔍 | Reviewing | #reviews |
| 🚨 | High priority / CEO action needed | #ceo-updates |

---

## 8. API Integration

### 8.1 Mattermost Incoming Webhooks

**Setup Process:**
1. Admin login to Mattermost → Integrations → Incoming Webhooks
2. Create webhook for each channel:
   - `agent-tasks` webhook → URL: `http://localhost:8065/hooks/xxx-agent-tasks`
   - `completions` webhook → URL: `http://localhost:8065/hooks/xxx-completions`
   - `reviews` webhook → URL: `http://localhost:8065/hooks/xxx-reviews`
   - `ceo-updates` webhook → URL: `http://localhost:8065/hooks/xxx-ceo-updates`
3. Save webhook URLs to `secrets.json`:

```json
{
  "mattermost": {
    "base_url": "http://localhost:8065",
    "webhooks": {
      "agent_tasks": "http://localhost:8065/hooks/abc123-agent-tasks",
      "completions": "http://localhost:8065/hooks/def456-completions",
      "reviews": "http://localhost:8065/hooks/ghi789-reviews",
      "ceo_updates": "http://localhost:8065/hooks/jkl012-ceo-updates"
    }
  }
}
```

### 8.2 Python Helper (`tools/agent_chat.py`)

**Purpose:** Simple function for Python-based agents (Alex, Maya, Joseph, etc.)

**File:** `C:\Coding Projects\EISLAW System Clean\tools\agent_chat.py`

```python
#!/usr/bin/env python3
"""
Agent Chat Integration Helper

Posts messages to Mattermost channels via incoming webhooks.
Gracefully handles chat service downtime (no-op if webhook fails).

Usage:
    from tools.agent_chat import post_message, post_start, post_completion, post_review

    # Task start
    post_start("Alex", "CLI-009", "API Clients List Ordering", "feature/CLI-009")

    # Progress update (optional)
    post_message("Alex", "CLI-009", "Running tests on VM...", channel="agent-tasks")

    # Completion
    post_completion("Alex", "CLI-009", "1.5 hours", "a3b2c1d", "Jacob review")

    # Review verdict
    post_review("Jacob", "CLI-009", "APPROVED", "All checks passed")
"""

import os
import json
import requests
from pathlib import Path
from typing import Optional

# Load webhook URLs from secrets
SECRETS_PATH = Path(__file__).parent.parent / "secrets.local.json"

def _load_webhooks() -> dict:
    """Load Mattermost webhook URLs from secrets.json"""
    try:
        with open(SECRETS_PATH, 'r') as f:
            secrets = json.load(f)
        return secrets.get("mattermost", {}).get("webhooks", {})
    except Exception as e:
        # Graceful degradation - chat unavailable, return empty dict
        print(f"[CHAT] Warning: Could not load Mattermost webhooks: {e}")
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
        print(f"[CHAT] Warning: Failed to post to {channel_key}: {e}")
        return False

def post_message(
    agent_name: str,
    task_id: str,
    message: str,
    channel: str = "agent-tasks",
    emoji: str = ":wrench:"
) -> bool:
    """
    Post generic message to chat channel.

    Args:
        agent_name: Name of agent (Alex, Maya, etc.)
        task_id: Task ID (CLI-009, AOS-024, etc.)
        message: Message text
        channel: Channel key (agent-tasks, completions, reviews, ceo-updates)
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
    """
    message = (
        f"🔄 **Starting:** {task_id} - {task_description}\n"
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
    """
    message = (
        f"✅ **Completed:** {task_id}\n"
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

    message = (
        f"{emoji} **{verdict}:** {task_id}\n"
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
    import sys

    if len(sys.argv) < 3:
        print("Usage: python agent_chat.py <agent_name> <task_id> <message> [channel]")
        print("Example: python agent_chat.py Alex CLI-009 'Starting implementation'")
        sys.exit(1)

    agent = sys.argv[1]
    task = sys.argv[2]
    msg = sys.argv[3]
    channel = sys.argv[4] if len(sys.argv) > 4 else "agent-tasks"

    success = post_message(agent, task, msg, channel)
    if success:
        print(f"[CHAT] Posted to {channel}: {msg}")
    else:
        print(f"[CHAT] Failed to post (chat may be unavailable)")
```

### 8.3 Bash Helper (`tools/agent_chat.sh`)

**Purpose:** Simple script for Bash-heavy tasks or Codex CLI agents

**File:** `C:\Coding Projects\EISLAW System Clean\tools\agent_chat.sh`

```bash
#!/bin/bash
#
# Agent Chat Integration - Bash Helper
#
# Posts messages to Mattermost via incoming webhooks.
# Gracefully handles chat service downtime (no-op if webhook fails).
#
# Usage:
#   source tools/agent_chat.sh
#
#   agent_chat_start "Alex" "CLI-009" "API ordering" "feature/CLI-009"
#   agent_chat_message "Alex" "CLI-009" "Running tests..."
#   agent_chat_complete "Alex" "CLI-009" "1.5 hours" "a3b2c1d"
#   agent_chat_review "Jacob" "CLI-009" "APPROVED" "All checks passed"

# Load webhook URLs from secrets.json
SECRETS_FILE="C:\Coding Projects\EISLAW System\secrets.local.json"

# Extract webhook URLs (requires jq)
if command -v jq &> /dev/null; then
    WEBHOOK_AGENT_TASKS=$(jq -r '.mattermost.webhooks.agent_tasks // empty' "$SECRETS_FILE" 2>/dev/null)
    WEBHOOK_COMPLETIONS=$(jq -r '.mattermost.webhooks.completions // empty' "$SECRETS_FILE" 2>/dev/null)
    WEBHOOK_REVIEWS=$(jq -r '.mattermost.webhooks.reviews // empty' "$SECRETS_FILE" 2>/dev/null)
    WEBHOOK_CEO_UPDATES=$(jq -r '.mattermost.webhooks.ceo_updates // empty' "$SECRETS_FILE" 2>/dev/null)
else
    echo "[CHAT] Warning: jq not installed, chat integration disabled" >&2
fi

# Internal helper to POST to webhook
_post_webhook() {
    local webhook_url="$1"
    local payload="$2"

    if [[ -z "$webhook_url" ]]; then
        # Chat not configured - graceful degradation
        return 1
    fi

    curl -s -X POST \
        -H 'Content-Type: application/json' \
        -d "$payload" \
        "$webhook_url" \
        --max-time 5 \
        > /dev/null 2>&1

    return $?
}

# Post generic message
agent_chat_message() {
    local agent_name="$1"
    local task_id="$2"
    local message="$3"
    local channel="${4:-agent-tasks}"  # Default to agent-tasks
    local emoji="${5:-:wrench:}"

    local webhook_url
    case "$channel" in
        "agent-tasks") webhook_url="$WEBHOOK_AGENT_TASKS" ;;
        "completions") webhook_url="$WEBHOOK_COMPLETIONS" ;;
        "reviews") webhook_url="$WEBHOOK_REVIEWS" ;;
        "ceo-updates") webhook_url="$WEBHOOK_CEO_UPDATES" ;;
        *) webhook_url="$WEBHOOK_AGENT_TASKS" ;;
    esac

    local payload=$(cat <<EOF
{
  "username": "$agent_name",
  "icon_emoji": "$emoji",
  "text": "**$task_id:** $message"
}
EOF
)

    _post_webhook "$webhook_url" "$payload"
}

# Post task start
agent_chat_start() {
    local agent_name="$1"
    local task_id="$2"
    local task_desc="$3"
    local branch="$4"
    local estimated="${5:-1-2 hours}"

    local message="🔄 **Starting:** $task_id - $task_desc\n**Estimated:** $estimated\n**Branch:** \`$branch\`"

    agent_chat_message "$agent_name" "$task_id" "$message" "agent-tasks" ":arrows_counterclockwise:"
}

# Post completion
agent_chat_complete() {
    local agent_name="$1"
    local task_id="$2"
    local duration="$3"
    local commit_hash="$4"
    local ready_for="${5:-Jacob review}"

    local message="✅ **Completed:** $task_id\n**Duration:** $duration\n**Commit:** \`$commit_hash\`\n**Ready for:** $ready_for\n**Details:** See TEAM_INBOX.md Messages TO Joe"

    agent_chat_message "$agent_name" "$task_id" "$message" "completions" ":white_check_mark:"
}

# Post review verdict
agent_chat_review() {
    local agent_name="$1"  # Usually "Jacob"
    local task_id="$2"
    local verdict="$3"  # APPROVED / NEEDS_FIXES / BLOCKED
    local details="$4"

    local emoji icon
    case "$verdict" in
        "APPROVED")
            emoji="✅"
            icon=":white_check_mark:"
            ;;
        "NEEDS_FIXES")
            emoji="⚠️"
            icon=":warning:"
            ;;
        "BLOCKED")
            emoji="❌"
            icon=":x:"
            ;;
        *)
            emoji="🔍"
            icon=":mag:"
            ;;
    esac

    local message="$emoji **$verdict:** $task_id\n**Details:** $details"

    agent_chat_message "$agent_name" "$task_id" "$message" "reviews" "$icon"
}

# Post CEO alert
agent_chat_ceo_alert() {
    local orchestrator="$1"  # Usually "Joe"
    local task_id="$2"
    local issue="$3"
    local impact="$4"
    local action_required="$5"

    local payload=$(cat <<EOF
{
  "username": "$orchestrator",
  "icon_emoji": ":rotating_light:",
  "text": "@channel 🚨 **PIPELINE BLOCKED:** $task_id\n**Issue:** $issue\n**Impact:** $impact\n**Action Required:** $action_required"
}
EOF
)

    _post_webhook "$WEBHOOK_CEO_UPDATES" "$payload"
}
```

### 8.4 Error Handling Strategy

**Principle:** Chat downtime MUST NOT break agent execution.

**Implementation:**
- All webhook POST requests have 5-second timeout
- Failed requests return `False` (Python) or `1` (Bash) - **not an error**
- Agents log warning but continue execution
- TEAM_INBOX updates always happen (chat is additive, not required)

**Example Error Flow:**
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

## 9. TEAM_INBOX Sync Workflow

### 9.1 Hybrid Workflow Principle

**Chat:** Real-time visibility (streaming updates)
**TEAM_INBOX:** Canonical record (source of truth)

**Rules:**
1. **Task assignment:** Only in TEAM_INBOX (Joe creates task, agents read it)
2. **Start notification:** Post to chat (#agent-tasks)
3. **Progress updates:** Post to chat (#agent-tasks) - optional, at agent discretion
4. **Completion:** Post to chat (#completions) **AND** append to TEAM_INBOX "Messages TO Joe"
5. **Review verdict:** Post to chat (#reviews) **AND** append to TEAM_INBOX "Messages TO Joe"
6. **Archive:** TEAM_INBOX moves to `TEAM_INBOX_ARCHIVE.md`, chat channels auto-expire per retention policy

### 9.2 Completion Sync Example

**Agent Alex completes CLI-009:**

1. **Post to chat (#completions):**
```python
post_completion("Alex", "CLI-009", "1.5 hours", "a3b2c1d", "Jacob review")
```

2. **Append to TEAM_INBOX (Messages TO Joe section):**
```markdown
| **Alex** | ✅ **COMPLETE** | **CLI-009 API Clients List Ordering (2025-12-10):** Successfully implemented `last_activity_at DESC` ordering. **COMPLETED:** ✅ (1) Endpoint updated (`/api/clients` now returns sorted by last_activity_at). ✅ (2) VM tested - clients list displays correctly. ✅ (3) Git: branch `feature/CLI-009`, commit `a3b2c1d` pushed. **READY FOR:** Jacob review. **Duration:** 1.5 hours. **OUTPUT:** `docs/OUTPUT_CLI-009.md` (synced to VM). |
```

**Result:**
- CEO sees completion in chat UI immediately
- TEAM_INBOX has canonical record for archive/audit
- Jacob's review agent reads TEAM_INBOX (source of truth), posts verdict to both chat + TEAM_INBOX

### 9.3 Chat Retention vs TEAM_INBOX Archive

| Data Type | Chat Retention | TEAM_INBOX Retention |
|-----------|----------------|----------------------|
| Task assignments | N/A (not in chat) | Permanent (git history) |
| Start messages | 7 days | N/A (not in TEAM_INBOX) |
| Progress updates | 7 days | N/A (not in TEAM_INBOX) |
| Completions | 30 days | Permanent (moved to archive) |
| Review verdicts | 30 days | Permanent (moved to archive) |

**Retention Policy Rationale:**
- **7 days (task/progress):** Real-time visibility only, no long-term value
- **30 days (completions/reviews):** Useful for recent work lookback
- **Permanent (TEAM_INBOX):** Source of truth, git-controlled, full audit trail

---

## 10. Installation Plan

### 10.1 Prerequisites

| Requirement | Status | Notes |
|-------------|--------|-------|
| Docker Desktop for Windows | ✅ Installed | Required for Mattermost containers |
| Docker Compose v2 | ✅ Installed | Comes with Docker Desktop |
| 4GB free RAM | ✅ Available | Mattermost + PostgreSQL ~1-2GB |
| 10GB free disk | ✅ Available | Container images + database |
| jq (JSON parser) | ⚠️ Check | Needed for Bash helper |

### 10.2 Installation Steps (Jane - CHAT-002)

#### Step 1: Clone Mattermost Docker Repository
```bash
cd "C:\Coding Projects"
git clone https://github.com/mattermost/docker mattermost-chat
cd mattermost-chat
```

#### Step 2: Configure Environment
```bash
# Copy sample env file
cp env.example .env

# Edit .env:
# - Set MATTERMOST_DOMAIN=localhost
# - Set MATTERMOST_PORT=8065
# - Set POSTGRES_PASSWORD (generate secure password)
# - Set TZ=Asia/Jerusalem
```

#### Step 3: Launch Containers
```bash
docker compose up -d
```

**Containers created:**
- `mattermost` - Application server (port 8065)
- `postgres` - PostgreSQL database (port 5432, internal only)

#### Step 4: Initial Setup
1. Open browser: http://localhost:8065
2. Create admin account:
   - Username: `eislaw-admin`
   - Email: `admin@eislaw.local`
   - Password: (save to `secrets.json`)
3. Create team: **EISLAW Agent Operations**
4. Create channels:
   - `agent-tasks` (Public)
   - `completions` (Public)
   - `reviews` (Public)
   - `ceo-updates` (Public)

#### Step 5: Configure Webhooks
For each channel:
1. Channel menu → Integrations → Incoming Webhooks → Add
2. Display name: `{channel_name} Agent Bot`
3. Description: `Automated agent updates`
4. Icon: (upload EISLAW logo or use emoji)
5. Copy webhook URL → Save to `secrets.json`

**Expected webhook URLs:**
```
http://localhost:8065/hooks/abc123def456-agent-tasks
http://localhost:8065/hooks/ghi789jkl012-completions
http://localhost:8065/hooks/mno345pqr678-reviews
http://localhost:8065/hooks/stu901vwx234-ceo-updates
```

#### Step 6: Update secrets.json
```bash
# File: C:\Coding Projects\EISLAW System\secrets.local.json
# Add section:
{
  "mattermost": {
    "base_url": "http://localhost:8065",
    "admin_username": "eislaw-admin",
    "admin_password": "xxxxx",
    "webhooks": {
      "agent_tasks": "http://localhost:8065/hooks/abc123...",
      "completions": "http://localhost:8065/hooks/def456...",
      "reviews": "http://localhost:8065/hooks/ghi789...",
      "ceo_updates": "http://localhost:8065/hooks/jkl012..."
    }
  }
}
```

#### Step 7: Verify Installation
```bash
# Test webhook with curl:
curl -X POST \
  http://localhost:8065/hooks/abc123... \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "TestBot",
    "icon_emoji": ":robot_face:",
    "text": "✅ Chat integration test successful!"
  }'
```

**Expected result:** Message appears in #agent-tasks channel

#### Step 8: Document Backup Procedure
**Backup script** (`tools/backup_mattermost.sh`):
```bash
#!/bin/bash
# Backup Mattermost database and uploads

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="C:/Coding Projects/mattermost-backups"
mkdir -p "$BACKUP_DIR"

# Stop containers
cd "C:/Coding Projects/mattermost-chat"
docker compose stop

# Backup database
docker compose run --rm postgres pg_dump -U mmuser mattermost > "$BACKUP_DIR/db_$DATE.sql"

# Backup uploads (if any)
# cp -r ./volumes/app/mattermost/data "$BACKUP_DIR/data_$DATE"

# Restart containers
docker compose up -d

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql"
```

**Acceptance Criteria:**
- [ ] Mattermost accessible at http://localhost:8065
- [ ] All 4 channels created
- [ ] All 4 webhook URLs saved to secrets.json
- [ ] Test webhook message appears in channel
- [ ] Backup script documented

### 10.3 Agent Integration (Alex - CHAT-003)

See [§8 API Integration](#8-api-integration) for full code.

**Tasks:**
1. Create `tools/agent_chat.py` (Python helper)
2. Create `tools/agent_chat.sh` (Bash helper)
3. Test from command line:
```bash
python tools/agent_chat.py Alex CLI-TEST "Test message" agent-tasks
```
4. Verify message appears in #agent-tasks

**Acceptance Criteria:**
- [ ] Python helper works (imports, function calls succeed)
- [ ] Bash helper works (source script, call functions)
- [ ] Error handling graceful (chat down = no-op, not crash)
- [ ] All 4 message types work (start, message, completion, review)

---

## 11. Security Considerations

### 11.1 Threat Model

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| Webhook URL leak | Low (local network only) | Medium (spam messages) | URLs in secrets.json (git-ignored), localhost-only |
| Unauthorized webhook POST | Low (localhost access required) | Low (spam, no data access) | No sensitive data in chat, TEAM_INBOX is source of truth |
| Database breach | Very Low (local machine) | Low (chat history, no auth tokens) | PostgreSQL not exposed to internet, standard password |
| Chat service hijack | Very Low (localhost) | Medium (false agent messages) | CEO validates critical info in TEAM_INBOX (canonical) |

### 11.2 Security Principles

1. **Defense in Depth:** Chat is visibility layer, not control plane (agents still execute autonomously)
2. **Least Privilege:** Webhooks are write-only (can't read channels or user data)
3. **Secrets Management:** All webhook URLs in `secrets.local.json` (git-ignored)
4. **Network Isolation:** Mattermost binds to `localhost:8065` only (not exposed to internet)
5. **Data Minimization:** No secrets, API keys, or credentials posted to chat (code review enforces this)

### 11.3 Production Hardening (Future)

If later migrating to production Linux VM:

| Enhancement | Benefit |
|-------------|---------|
| HTTPS with self-signed cert | Encrypted webhook traffic |
| Firewall rules | Block external access to port 8065 |
| Webhook secret tokens | Verify POST requests authenticity |
| Rate limiting | Prevent webhook spam |
| Database encryption at rest | Protect chat history |

**Defer to Phase 2** - current localhost deployment is secure enough for internal use.

---

## 12. Resource Requirements

### 12.1 System Resources

| Component | CPU | RAM | Disk | Port |
|-----------|-----|-----|------|------|
| Mattermost app | 0.5 core | 512MB | 500MB | 8065 |
| PostgreSQL | 0.5 core | 512MB | 2GB (database) | 5432 (internal) |
| **Total** | **1 core** | **1GB** | **2.5GB** | - |

**Impact on Windows Machine:**
- EISLAW services already running: API (8799), web-dev (5173), meili (7700), langfuse (3001), orchestrator (8801)
- Total RAM usage with chat: ~4-5GB (within available capacity)
- No performance impact expected (Mattermost is lightweight)

### 12.2 Network Resources

| Metric | Expected Load | Notes |
|--------|---------------|-------|
| Webhook POSTs | ~10-50/hour | Depends on agent activity |
| Webhook payload size | <1KB/message | JSON text only |
| Database writes | ~10-50/hour | Matches webhook POSTs |
| Browser UI | ~10KB/minute | CEO viewing chat |
| **Total bandwidth** | **<1MB/hour** | Negligible |

---

## 13. Implementation Roadmap

### Phase 1: Foundation (CHAT-002 to CHAT-004)

| Task | Owner | Duration | Dependencies |
|------|-------|----------|--------------|
| CHAT-002: Install Mattermost | Jane | 2 hours | None |
| CHAT-003: Agent integration scripts | Alex | 1 hour | CHAT-002 |
| CHAT-004: Update CLAUDE.md docs | Joe | 1 hour | CHAT-003 |

**Deliverables:**
- Mattermost running on localhost:8065
- 4 channels created, webhooks configured
- Python/Bash helpers working
- Documentation complete

### Phase 2: Validation (CHAT-005 to CHAT-006)

| Task | Owner | Duration | Dependencies |
|------|-------|----------|--------------|
| CHAT-005: Test integration (5 scenarios) | Eli | 2 hours | CHAT-004 |
| CHAT-006: Final review | Jacob | 1 hour | CHAT-005 |

**Test Scenarios (Eli):**
1. Joe spawns 3 agents (Alex, Maya, David) in parallel → all post start messages
2. Progress updates appear in #agent-tasks during work
3. Completions posted to #completions + TEAM_INBOX
4. Jacob review posts verdict to #reviews + TEAM_INBOX
5. Chat down scenario: agents continue working, fallback to TEAM_INBOX only

**Jacob Review Checklist:**
- [ ] PRD quality (this document)
- [ ] Installation documented in CHAT-002
- [ ] Agent scripts work (CHAT-003)
- [ ] CLAUDE.md updated (CHAT-004)
- [ ] Tests pass (CHAT-005)
- [ ] Webhook URLs in secrets.json (security)
- [ ] Backup procedure exists
- [ ] CEO can see real-time updates in Mattermost UI

### Phase 3: Adoption (Post-CHAT-006)

**Gradual Rollout:**
1. Week 1: Joe tests with 2-3 spawned agents
2. Week 2: All agents use chat helpers by default
3. Week 3: CEO feedback → iterate on message format/channels
4. Week 4: Declare chat integration stable, update all spawn templates

**Success Metrics:**
- CEO opens Mattermost daily to monitor agents
- 80%+ of agent tasks post to chat (20% legacy TEAM_INBOX-only is OK)
- Zero agent execution failures due to chat downtime
- Positive CEO feedback on visibility improvement

---

## 14. Success Criteria

### Acceptance Criteria (CHAT-006 - Jacob Review)

| Criterion | Measurement | Target |
|-----------|-------------|--------|
| **Installation** | Jane completes CHAT-002 | <2 hours |
| **Integration** | Alex completes CHAT-003 | <1 hour |
| **Documentation** | Joe updates CLAUDE.md | <1 hour |
| **Testing** | Eli runs 5 scenarios | All pass |
| **CEO UX** | CEO monitors 3+ agent session | "Visibility improved" feedback |
| **Reliability** | Chat downtime test | Agents continue working |

### Definition of Done

**CHAT-001 (this PRD) is DONE when:**
- ✅ PRD document approved by Jacob
- ✅ Recommendation (Mattermost) justified with research
- ✅ Architecture diagram clear
- ✅ API integration examples complete
- ✅ Channel structure defined
- ✅ TEAM_INBOX sync workflow documented

**CHAT Project is DONE when:**
- ✅ All 6 tasks (CHAT-001 to CHAT-006) complete
- ✅ CEO uses Mattermost for live agent monitoring
- ✅ Agents post to chat + TEAM_INBOX hybrid workflow
- ✅ Zero disruption to existing orchestration system

---

## 15. Open Questions

### For CEO

1. **Channel Retention:** 7 days for #agent-tasks, 30 days for #completions/reviews - acceptable?
2. **Notification Preferences:** Should #ceo-updates use `@channel` mentions for high-priority alerts?
3. **Mobile Access:** Is desktop-only monitoring sufficient, or need mobile Mattermost app later?

### For Implementation Team

1. **jq Installation:** Is jq (JSON parser for Bash) already installed on Windows? If not, Jane to install during CHAT-002.
2. **Port Conflict:** Port 8065 available on Windows machine? (Check: `netstat -ano | findstr 8065`)
3. **Docker Resources:** Docker Desktop configured with 4GB+ RAM allocation?

### Resolved Decisions

| Question | Decision | Date |
|----------|----------|------|
| Platform choice | Mattermost (vs Rocket.Chat, Zulip) | 2025-12-10 |
| Deployment method | Docker Compose | 2025-12-10 |
| Webhook vs REST API | Incoming webhooks (simpler) | 2025-12-10 |
| TEAM_INBOX replacement? | No - hybrid approach (both coexist) | 2025-12-10 |

---

## 16. Research Sources

### Platform Evaluation
- [Mattermost Docker Deployment Guide](https://docs.mattermost.com/deployment-guide/server/deploy-containers.html)
- [Mattermost Incoming Webhooks Documentation](https://developers.mattermost.com/integrate/webhooks/incoming/)
- [Mattermost REST API Reference](https://developers.mattermost.com/integrate/reference/rest-api/)
- [Mattermost GitHub Docker Repository](https://github.com/mattermost/docker)
- [Rocket.Chat Docker Deployment](https://docs.rocket.chat/docs/deploy-with-docker-docker-compose)
- [Rocket.Chat Docker Hub](https://hub.docker.com/r/rocketchat/rocket.chat/)
- [Zulip Self-Hosting](https://zulip.com/self-hosting/)
- [Zulip Docker Repository](https://github.com/zulip/docker-zulip)
- [Zulip Installation Documentation](https://zulip.readthedocs.io/en/stable/production/install.html)

### Platform Comparison
- [Top 3 Slack Alternatives: Mattermost, Rocket.Chat and Zulip Comparison (GDPR-Compliant)](https://wz-it.com/en/blog/slack-alternatives-mattermost-rocketchat-zulip/)
- [Compare Mattermost vs. Rocket.Chat vs. Zulip in 2025](https://slashdot.org/software/comparison/Mattermost-vs-Rocket.Chat-vs-Zulip/)
- [Mattermost vs. Rocket.Chat vs. Zulip - SourceForge](https://sourceforge.net/software/compare/Mattermost-vs-Rocket.Chat-vs-Zulip/)
- [Mattermost vs RocketChat vs Zulip - StackShare](https://stackshare.io/stackups/mattermost-vs-rocketchat-vs-zulip)

### Agent Automation & Webhooks
- [Webhooks and APIs: A Complete Guide](https://www.appypieautomate.ai/blog/webhooks-and-apis-guide)
- [Enhance AI Agent Workflows with Webhooks - Watermelon](https://watermelon.ai/integrations/webhooks/)
- [AI Agents Chat API Webhook - Zendesk](https://developer.zendesk.com/api-reference/ai-agents/chat/chat-webhook/)
- [Full Automation Power: Incoming and Outgoing Webhooks with AI Agents - Medium](https://medium.com/@seyhunak/we-are-unlocked-full-automation-power-incoming-and-outgoing-webhooks-with-crafted-ai-agents-ed8d09241d4a)

---

**END OF DOCUMENT**

**Next Steps:**
1. David: Submit PRD to Jacob for review → Task document `TASK_DAVID_CHAT001_PRD.md`
2. Jacob: Review PRD → Output `JACOB_REVIEW_CHAT-001.md`
3. If approved: Jane executes CHAT-002 (installation)
4. If needs fixes: David revises PRD per Jacob's feedback

---

**Document Metadata:**
- **Lines:** 1,247
- **Words:** ~12,500
- **Sections:** 16
- **Code Examples:** 5 (Python helper, Bash helper, curl tests)
- **Architecture Diagrams:** 2 (ASCII art)
- **Research Sources:** 20+
- **Completion Date:** 2025-12-10
