"""
Chat Bridge Configuration Loader

Loads configuration from:
1. Environment variables (for production/Docker)
2. secrets.local.json (for local development)

Reference: PRD_MATTERMOST_BIDIRECTIONAL.md Section 10.2, Appendix D
"""

import os
import json
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, Field


class MattermostConfig(BaseModel):
    """Mattermost connection configuration."""
    base_url: str = Field("http://localhost:8065", description="Mattermost server URL")
    api_token: str = Field("", description="Personal access token or bot token")
    webhook_secret: str = Field("", description="Outgoing webhook token for verification")
    webhooks: dict = Field(default_factory=dict, description="Incoming webhook URLs by channel")


class BridgeConfig(BaseModel):
    """Bridge service configuration."""
    host: str = Field("0.0.0.0", description="Host to bind to")
    port: int = Field(8802, description="Port to listen on")
    log_level: str = Field("INFO", description="Logging level")
    spawn_timeout: int = Field(30, description="Timeout for agent spawn (seconds)")
    max_concurrent_agents: int = Field(5, description="Maximum concurrent spawned agents")
    spawn_delay_seconds: float = Field(2.0, description="Delay between spawns (rate limiting)")


class PathConfig(BaseModel):
    """File paths for project resources."""
    team_inbox: Path = Field(
        default_factory=lambda: Path("C:/Coding Projects/EISLAW System Clean/docs/TEAM_INBOX.md")
    )
    task_template: Path = Field(
        default_factory=lambda: Path("C:/Coding Projects/EISLAW System Clean/docs/TASK_TEMPLATE.md")
    )
    claude_md: Path = Field(
        default_factory=lambda: Path("C:/Coding Projects/CLAUDE.md")
    )
    working_copy: Path = Field(
        default_factory=lambda: Path("C:/Coding Projects/EISLAW System Clean")
    )


class Config(BaseModel):
    """Complete bridge configuration."""
    mattermost: MattermostConfig = Field(default_factory=MattermostConfig)
    bridge: BridgeConfig = Field(default_factory=BridgeConfig)
    paths: PathConfig = Field(default_factory=PathConfig)


def _find_secrets_file() -> Optional[Path]:
    """
    Find secrets.local.json in expected locations.

    Searches:
    1. C:/Coding Projects/EISLAW System/secrets.local.json (CLAUDE.md specified)
    2. ../../../secrets.local.json (relative to chat_bridge)
    3. Current working directory
    """
    search_paths = [
        Path("C:/Coding Projects/EISLAW System/secrets.local.json"),
        Path(__file__).parent.parent.parent.parent / "EISLAW System" / "secrets.local.json",
        Path.cwd() / "secrets.local.json",
    ]

    for path in search_paths:
        if path.exists():
            return path

    return None


def _load_secrets() -> dict:
    """Load secrets from secrets.local.json."""
    secrets_path = _find_secrets_file()
    if not secrets_path:
        return {}

    try:
        with open(secrets_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"[CONFIG] Warning: Could not load secrets from {secrets_path}: {e}")
        return {}


def load_config() -> Config:
    """
    Load configuration from environment and secrets file.

    Priority:
    1. Environment variables (highest)
    2. secrets.local.json
    3. Default values (lowest)
    """
    secrets = _load_secrets()
    mm_secrets = secrets.get("mattermost", {})

    # Mattermost config
    mattermost = MattermostConfig(
        base_url=os.environ.get("MATTERMOST_URL", mm_secrets.get("base_url", "http://localhost:8065")),
        api_token=os.environ.get("MATTERMOST_API_TOKEN", mm_secrets.get("api_token", "")),
        webhook_secret=os.environ.get("MATTERMOST_WEBHOOK_SECRET", mm_secrets.get("webhook_secret", "")),
        webhooks=mm_secrets.get("webhooks", {}),
    )

    # Bridge config
    bridge = BridgeConfig(
        host=os.environ.get("BRIDGE_HOST", "0.0.0.0"),
        port=int(os.environ.get("BRIDGE_PORT", "8802")),
        log_level=os.environ.get("LOG_LEVEL", "INFO"),
        spawn_timeout=int(os.environ.get("SPAWN_TIMEOUT", "30")),
        max_concurrent_agents=int(os.environ.get("MAX_CONCURRENT_AGENTS", "5")),
        spawn_delay_seconds=float(os.environ.get("SPAWN_DELAY_SECONDS", "2.0")),
    )

    # Path config (use defaults, can override via env)
    paths = PathConfig()
    if os.environ.get("TEAM_INBOX_PATH"):
        paths.team_inbox = Path(os.environ["TEAM_INBOX_PATH"])
    if os.environ.get("WORKING_COPY_PATH"):
        paths.working_copy = Path(os.environ["WORKING_COPY_PATH"])

    return Config(
        mattermost=mattermost,
        bridge=bridge,
        paths=paths,
    )


# Global config instance (lazy loaded)
_config: Optional[Config] = None


def get_config() -> Config:
    """Get the global config instance (singleton pattern)."""
    global _config
    if _config is None:
        _config = load_config()
    return _config


def reload_config() -> Config:
    """Force reload configuration (useful for testing)."""
    global _config
    _config = load_config()
    return _config


# Rate limiting settings
RATE_LIMIT_CALLS = 5  # Max commands per user
RATE_LIMIT_PERIOD = 60  # Per this many seconds

# Agent spawning settings
MAX_ITERATIONS_PER_AGENT = 10  # Safety limit for tool execution loops

# Allowed commands whitelist (for security)
ALLOWED_RAW_COMMANDS = {
    "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "?", "help",
    "fix", "review", "next", "approve", "kill", "stop",
    "suggest", "status", "retry", "merge",
    "create",  # Followed by A, B, C, all, or combination
}
