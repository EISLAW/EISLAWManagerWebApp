"""
Chat Bridge Models - Pydantic schemas and enums for bidirectional Mattermost integration.

This module defines all data structures for:
- Context extraction from messages
- Command interpretation
- Webhook payloads
- Response types

Reference: PRD_MATTERMOST_BIDIRECTIONAL.md sections 4, 5, and 10
"""

from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


# =============================================================================
# ENUMS - Command types, message types, and statuses
# =============================================================================

class MessageType(str, Enum):
    """
    Message types detected from agent chat messages.
    Reference: PRD §4 - Message Type Detection
    """
    START = "start"                       # Contains emoji or "Starting work"
    PROGRESS = "progress"                 # Contains "Running" or "Testing"
    COMPLETION = "completion"             # Contains checkmark and "complete"
    REVIEW_APPROVED = "review_approved"   # Contains clipboard and "APPROVED"
    REVIEW_NEEDS_FIXES = "review_needs_fixes"  # Contains clipboard and "NEEDS_FIXES"
    ALERT = "alert"                       # Contains warning emoji
    UNKNOWN = "unknown"                   # Could not determine type


class CommandType(str, Enum):
    """
    Available commands for bidirectional communication.
    Reference: PRD §5 - Command Matrix
    """
    HELP = "help"           # ? - Show available commands
    FIX = "fix"             # 1 - Re-spawn original agent
    REVIEW = "review"       # 2 - Spawn Jacob to review
    NEXT = "next"           # 3 - Spawn unblocked tasks
    APPROVE = "approve"     # 4 - Quick approve (skip Jacob)
    KILL = "kill"           # 5 - Terminate agent process
    SUGGEST = "suggest"     # 6 - Joe suggests task breakdown
    STATUS = "status"       # 7 - Joe analyzes task state
    RETRY = "retry"         # 8 - Retry failed command
    MERGE = "merge"         # 9 - Merge branch to main
    CREATE = "create"       # create A/B/all - Create suggested tasks
    INVALID = "invalid"     # Unknown command


class ProcessStatus(str, Enum):
    """
    Status of spawned agent processes.
    Reference: PRD §10.4 - Process Management
    """
    RUNNING = "running"
    COMPLETED = "completed"
    KILLED = "killed"
    FAILED = "failed"


class TaskStatus(str, Enum):
    """
    Task status values (for status command output).
    Reference: PRD §7 - Status Command Specification
    """
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    AWAITING_REVIEW = "awaiting_review"
    APPROVED = "approved"
    NEEDS_FIXES = "needs_fixes"


# =============================================================================
# NUMBER-TO-COMMAND MAPPING
# =============================================================================

# Map single digits to command types
# Reference: PRD §5 - Number-to-Command Mnemonic
NUMBER_TO_COMMAND: dict[str, CommandType] = {
    "1": CommandType.FIX,
    "2": CommandType.REVIEW,
    "3": CommandType.NEXT,
    "4": CommandType.APPROVE,
    "5": CommandType.KILL,
    "6": CommandType.SUGGEST,
    "7": CommandType.STATUS,
    "8": CommandType.RETRY,
    "9": CommandType.MERGE,
    "?": CommandType.HELP,
}

# Map word aliases to command types
WORD_TO_COMMAND: dict[str, CommandType] = {
    "help": CommandType.HELP,
    "fix": CommandType.FIX,
    "review": CommandType.REVIEW,
    "next": CommandType.NEXT,
    "approve": CommandType.APPROVE,
    "kill": CommandType.KILL,
    "stop": CommandType.KILL,  # Alias
    "suggest": CommandType.SUGGEST,
    "status": CommandType.STATUS,
    "retry": CommandType.RETRY,
    "merge": CommandType.MERGE,
    "create": CommandType.CREATE,
}


# =============================================================================
# COMMAND AVAILABILITY BY MESSAGE TYPE
# =============================================================================

# Reference: PRD §5 - Command Availability by Message Type
AVAILABLE_COMMANDS: dict[MessageType, set[CommandType]] = {
    MessageType.COMPLETION: {
        CommandType.HELP,
        CommandType.REVIEW,
        CommandType.NEXT,
        CommandType.APPROVE,
        CommandType.SUGGEST,
        CommandType.STATUS,
    },
    MessageType.REVIEW_APPROVED: {
        CommandType.HELP,
        CommandType.NEXT,
        CommandType.STATUS,
        CommandType.MERGE,
    },
    MessageType.REVIEW_NEEDS_FIXES: {
        CommandType.HELP,
        CommandType.FIX,
        CommandType.STATUS,
    },
    MessageType.START: {
        CommandType.HELP,
        CommandType.KILL,
        CommandType.STATUS,
    },
    MessageType.PROGRESS: {
        CommandType.HELP,
        CommandType.KILL,
        CommandType.STATUS,
    },
    MessageType.ALERT: {
        CommandType.HELP,
        CommandType.STATUS,
    },
    MessageType.UNKNOWN: {
        CommandType.HELP,
        CommandType.STATUS,
    },
}


# =============================================================================
# CONTEXT MODELS - Extracted from parent messages
# =============================================================================

class MessageContext(BaseModel):
    """
    Context extracted from a parent message.
    Reference: PRD §4 - Context Object Schema
    """
    task_id: Optional[str] = Field(None, description="Task ID (e.g., CLI-009)")
    agent_name: Optional[str] = Field(None, description="Agent who posted (e.g., Alex)")
    message_type: MessageType = Field(MessageType.UNKNOWN, description="Type of message")
    branch: Optional[str] = Field(None, description="Git branch if mentioned")
    original_message: str = Field("", description="Full original message text")
    channel_id: str = Field("", description="Mattermost channel ID")
    post_id: str = Field("", description="Mattermost post ID")
    timestamp: Optional[datetime] = Field(None, description="Message timestamp")

    # Additional metadata
    has_unblocks: bool = Field(False, description="Message mentions unblocked tasks")
    review_items: List[str] = Field(default_factory=list, description="Review fix items if NEEDS_FIXES")

    class Config:
        use_enum_values = True


# =============================================================================
# WEBHOOK MODELS - Mattermost incoming/outgoing webhooks
# =============================================================================

class MattermostWebhookPayload(BaseModel):
    """
    Incoming webhook payload from Mattermost.
    Reference: Mattermost Developer Docs - Outgoing Webhooks
    """
    token: str = Field(..., description="Outgoing webhook token for verification")
    team_id: str = Field("", description="Team ID")
    team_domain: str = Field("", description="Team domain name")
    channel_id: str = Field(..., description="Channel ID where message was posted")
    channel_name: str = Field("", description="Channel name")
    timestamp: int = Field(0, description="Unix timestamp of message")
    user_id: str = Field(..., description="User ID who sent message")
    user_name: str = Field("", description="Username who sent message")
    post_id: str = Field("", description="ID of the post")
    text: str = Field(..., description="Message text content")
    trigger_word: str = Field("", description="Word that triggered webhook")
    file_ids: str = Field("", description="Comma-separated file IDs if attachments")

    # Thread context
    root_id: Optional[str] = Field(None, description="Root post ID if this is a reply")
    parent_id: Optional[str] = Field(None, description="Parent post ID if this is a reply")

    class Config:
        extra = "allow"  # Mattermost may send additional fields


class MattermostPost(BaseModel):
    """
    Mattermost post object (from REST API response).
    Used when fetching parent message for context.
    """
    id: str = Field(..., description="Post ID")
    create_at: int = Field(0, description="Creation timestamp (ms)")
    update_at: int = Field(0, description="Update timestamp (ms)")
    edit_at: int = Field(0, description="Edit timestamp (ms)")
    delete_at: int = Field(0, description="Deletion timestamp (ms)")
    user_id: str = Field("", description="User ID of author")
    channel_id: str = Field("", description="Channel ID")
    root_id: str = Field("", description="Root post ID for threads")
    parent_id: str = Field("", description="Parent post ID")
    message: str = Field("", description="Post content")
    type: str = Field("", description="Post type")

    # Metadata
    hashtags: str = Field("", description="Hashtags in message")
    props: dict = Field(default_factory=dict, description="Additional properties")

    class Config:
        extra = "allow"


# =============================================================================
# COMMAND MODELS - Parsed commands and actions
# =============================================================================

class ParsedCommand(BaseModel):
    """
    Result of parsing user input into a command.
    """
    command_type: CommandType = Field(..., description="Type of command")
    raw_input: str = Field("", description="Original user input")
    is_valid: bool = Field(True, description="Whether command is valid")
    is_available: bool = Field(True, description="Whether command is available for context")
    error_message: Optional[str] = Field(None, description="Error message if invalid")

    # For CREATE command
    create_groups: List[str] = Field(default_factory=list, description="Groups to create (A, B, C, all)")
    spawn_after_create: bool = Field(False, description="Spawn agents after creating tasks")


class CommandAction(BaseModel):
    """
    Action to execute based on command and context.
    """
    command: ParsedCommand
    context: MessageContext
    action_type: str = Field("", description="Type of action (spawn_review, spawn_fix, etc.)")
    agent_to_spawn: Optional[str] = Field(None, description="Agent name to spawn")
    spawn_prompt: Optional[str] = Field(None, description="Prompt for spawned agent")


# =============================================================================
# PROCESS TRACKING MODELS - For kill command support
# =============================================================================

class ProcessInfo(BaseModel):
    """
    Information about a spawned agent process.
    Reference: PRD §10.4.1 - PID Tracking Architecture
    """
    task_id: str = Field(..., description="Task ID")
    pid: int = Field(..., description="Process ID")
    agent_name: str = Field(..., description="Agent name (Alex, Maya, etc.)")
    start_time: datetime = Field(default_factory=datetime.utcnow, description="When spawned")
    command_type: str = Field("spawn", description="Type of command that spawned this")
    status: ProcessStatus = Field(ProcessStatus.RUNNING, description="Current status")

    class Config:
        use_enum_values = True


# =============================================================================
# RESPONSE MODELS - Bot responses to CEO
# =============================================================================

class BridgeResponse(BaseModel):
    """
    Response from bridge service to post back to chat.
    """
    success: bool = Field(True, description="Whether action succeeded")
    message: str = Field("", description="Message to post to chat")
    channel: str = Field("agent-tasks", description="Channel to post to")
    emoji: str = Field(":robot:", description="Bot emoji to use")
    error_code: Optional[str] = Field(None, description="Error code if failed")


class HelpResponse(BaseModel):
    """
    Help response for a specific message context.
    Reference: PRD §9 - Universal Help System
    """
    task_id: Optional[str]
    message_type: MessageType
    available_commands: List[dict] = Field(default_factory=list)  # [{num, word, description}]
    universal_commands: List[dict] = Field(default_factory=list)

    def format_message(self) -> str:
        """Format help response as markdown for chat."""
        lines = []

        if self.task_id:
            lines.append(f"**{self.task_id}:** Available commands")
        else:
            lines.append("**EISLAW Bot:** General commands")

        lines.append("")

        if self.available_commands:
            lines.append(f"**For this {self.message_type.upper()} message:**")
            for cmd in self.available_commands:
                lines.append(f"`{cmd['num']}` or `{cmd['word']}` -> {cmd['description']}")

        lines.append("")
        lines.append("**Universal commands:**")
        for cmd in self.universal_commands:
            lines.append(f"`{cmd['key']}` -> {cmd['description']}")

        return "\n".join(lines)


class StatusResponse(BaseModel):
    """
    Status report for a task.
    Reference: PRD §7 - Status Command Specification
    """
    task_id: str
    task_title: str = ""
    description: str = ""
    current_state: TaskStatus = TaskStatus.IN_PROGRESS
    agent_working: Optional[str] = None
    started_ago: Optional[str] = None
    branch: Optional[str] = None
    last_commit: Optional[str] = None
    commit_ago: Optional[str] = None
    blockers: List[str] = Field(default_factory=list)
    downstream: List[str] = Field(default_factory=list)
    recommendation: str = ""

    def format_message(self) -> str:
        """Format status response as markdown for chat."""
        status_emoji = {
            TaskStatus.NOT_STARTED: "pause_button",
            TaskStatus.IN_PROGRESS: "arrows_counterclockwise",
            TaskStatus.BLOCKED: "x",
            TaskStatus.AWAITING_REVIEW: "eyes",
            TaskStatus.APPROVED: "white_check_mark",
            TaskStatus.NEEDS_FIXES: "warning",
        }

        emoji = status_emoji.get(self.current_state, "question")

        lines = [
            f"**STATUS: {self.task_id}** - {self.task_title}",
            "",
            f"**What it is:**",
            f"{self.description}",
            "",
            f"**Current state:**",
            f":{emoji}: {self.current_state.value.upper()}",
        ]

        if self.agent_working:
            lines.append(f"by {self.agent_working} (started {self.started_ago})")
        if self.branch:
            lines.append(f"Branch: `{self.branch}`")
        if self.last_commit:
            lines.append(f'Last commit: "{self.last_commit}" ({self.commit_ago})')

        lines.append("")
        lines.append("**What blocks it:**")
        if self.blockers:
            for b in self.blockers:
                lines.append(f"- {b}")
        else:
            lines.append("None - actively being worked on")

        lines.append("")
        lines.append("**What it blocks:**")
        if self.downstream:
            for d in self.downstream:
                lines.append(f"- {d}")
        else:
            lines.append("Nothing")

        lines.append("")
        lines.append("**Recommendation:**")
        lines.append(self.recommendation)

        return "\n".join(lines)


# =============================================================================
# REGEX PATTERNS - For context extraction
# =============================================================================

class RegexPatterns:
    """
    Regex patterns for parsing agent messages.
    Reference: PRD §15 Appendix A - Message Regex Patterns
    """
    # Task ID: Match **CLI-009:** or **AOS-024:**
    TASK_ID = r'\*\*([A-Z]+-\d+)\*\*:'

    # Agent name: Match **Alex**: or **Jacob**:
    AGENT_NAME = r'\*\*([A-Za-z]+)\*\*:'

    # Branch: Match feature/CLI-009 or feature/BIDI-001
    BRANCH = r'feature/([A-Z]+-\d+)'

    # Message type patterns
    COMPLETION = r'(checkmark|white_check_mark|heavy_check_mark).*[Tt]ask complete'
    REVIEW_APPROVED = r'(clipboard).*[Aa][Pp][Pp][Rr][Oo][Vv][Ee][Dd]'
    REVIEW_NEEDS_FIXES = r'(clipboard).*[Nn][Ee][Ee][Dd][Ss]_[Ff][Ii][Xx][Ee][Ss]'
    START = r'(rocket).*[Ss]tarting work'
    PROGRESS = r'(Running|Testing|Working|Implementing)'
    ALERT = r'(rotating_light|warning)'

    # Unicode emoji patterns (for actual emoji characters)
    EMOJI_COMPLETION = r'[\u2705\u2714].*[Tt]ask complete'  # checkmark, heavy_check_mark
    EMOJI_REVIEW_APPROVED = r'[\U0001F4CB].*APPROVED'  # clipboard
    EMOJI_REVIEW_NEEDS_FIXES = r'[\U0001F4CB].*NEEDS_FIXES'
    EMOJI_START = r'[\U0001F680].*[Ss]tarting'  # rocket
    EMOJI_ALERT = r'[\U0001F6A8\u26A0]'  # rotating_light, warning
