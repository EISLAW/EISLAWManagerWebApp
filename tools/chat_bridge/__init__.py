"""
Chat Bridge - Bidirectional Mattermost Integration

This package provides a FastAPI bridge service that enables bidirectional
communication between CEO and agents via Mattermost chat.

Features:
- Context-aware reply system (parse task ID, agent, message type from parent)
- Number shortcuts (1-9) for mobile UX
- Universal help system (? shows available commands)
- Agent spawning via Claude CLI
- Status and Suggest commands via Joe

Reference: PRD_MATTERMOST_BIDIRECTIONAL.md

Package Structure:
    chat_bridge/
    +-- __init__.py       # This file
    +-- models.py         # Pydantic schemas, enums
    +-- config.py         # Configuration loader
    +-- context.py        # Message context extraction
    +-- commands.py       # Command interpretation
    +-- mattermost.py     # Mattermost REST API client
    +-- spawn.py          # Claude CLI agent spawning
    +-- main.py           # FastAPI application
    +-- tests/            # Unit and integration tests

Usage:
    # Run the bridge service
    cd tools/chat_bridge
    uvicorn main:app --port 8802

    # Or use the models directly
    from tools.chat_bridge.models import MessageContext, CommandType, MessageType
"""

__version__ = "0.1.0"
__author__ = "Alex (Senior Backend Engineer)"

# Export key classes for convenience
from .models import (
    # Enums
    MessageType,
    CommandType,
    ProcessStatus,
    TaskStatus,
    # Mappings
    NUMBER_TO_COMMAND,
    WORD_TO_COMMAND,
    AVAILABLE_COMMANDS,
    # Context models
    MessageContext,
    MattermostWebhookPayload,
    MattermostPost,
    # Command models
    ParsedCommand,
    CommandAction,
    # Process tracking
    ProcessInfo,
    # Response models
    BridgeResponse,
    HelpResponse,
    StatusResponse,
    # Patterns
    RegexPatterns,
)

__all__ = [
    # Version info
    "__version__",
    "__author__",
    # Enums
    "MessageType",
    "CommandType",
    "ProcessStatus",
    "TaskStatus",
    # Mappings
    "NUMBER_TO_COMMAND",
    "WORD_TO_COMMAND",
    "AVAILABLE_COMMANDS",
    # Context models
    "MessageContext",
    "MattermostWebhookPayload",
    "MattermostPost",
    # Command models
    "ParsedCommand",
    "CommandAction",
    # Process tracking
    "ProcessInfo",
    # Response models
    "BridgeResponse",
    "HelpResponse",
    "StatusResponse",
    # Patterns
    "RegexPatterns",
]
