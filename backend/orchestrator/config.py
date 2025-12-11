"""
EISLAW Agent Orchestrator - Configuration
Created by Alex (AOS-023)

Loads environment variables for:
- LLM API keys (Anthropic, OpenAI, Gemini)
- Langfuse tracing configuration
- TEAM_INBOX path for auto-updates
"""
import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class LangfuseConfig:
    """Langfuse tracing configuration (self-hosted on VM)."""
    secret_key: Optional[str]
    public_key: Optional[str]
    host: str = "http://20.217.86.4:3001"

    @property
    def is_configured(self) -> bool:
        """Check if Langfuse keys are configured."""
        return bool(self.secret_key and self.public_key)


@dataclass
class LLMConfig:
    """LLM API keys for agent orchestration."""
    anthropic_api_key: Optional[str]
    openai_api_key: Optional[str]
    gemini_api_key: Optional[str]

    @property
    def has_anthropic(self) -> bool:
        return bool(self.anthropic_api_key)

    @property
    def has_openai(self) -> bool:
        return bool(self.openai_api_key)

    @property
    def has_gemini(self) -> bool:
        return bool(self.gemini_api_key)


@dataclass
class Config:
    """Main configuration for EISLAW Agent Orchestrator."""
    langfuse: LangfuseConfig
    llm: LLMConfig
    team_inbox_path: str = "/app/docs/TEAM_INBOX.md"
    service_name: str = "eislaw-orchestrator"
    version: str = "0.1.0-poc"

    def get_status(self) -> dict:
        """Return configuration status for health checks."""
        return {
            "langfuse_configured": self.langfuse.is_configured,
            "langfuse_host": self.langfuse.host,
            "anthropic_configured": self.llm.has_anthropic,
            "openai_configured": self.llm.has_openai,
            "gemini_configured": self.llm.has_gemini,
            "team_inbox_path": self.team_inbox_path,
        }


def load_config() -> Config:
    """
    Load configuration from environment variables.

    Expected env vars (from docker-compose.yml):
    - ANTHROPIC_API_KEY
    - OPENAI_API_KEY
    - GEMINI_API_KEY
    - LANGFUSE_SECRET_KEY
    - LANGFUSE_PUBLIC_KEY
    - LANGFUSE_HOST (default: http://20.217.86.4:3001)
    - TEAM_INBOX_PATH (default: /app/docs/TEAM_INBOX.md)
    """
    langfuse = LangfuseConfig(
        secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
        public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
        host=os.getenv("LANGFUSE_HOST", "http://20.217.86.4:3001"),
    )

    llm = LLMConfig(
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        gemini_api_key=os.getenv("GEMINI_API_KEY"),
    )

    return Config(
        langfuse=langfuse,
        llm=llm,
        team_inbox_path=os.getenv("TEAM_INBOX_PATH", "/app/docs/TEAM_INBOX.md"),
    )


# Global config instance (loaded on import)
config = load_config()
