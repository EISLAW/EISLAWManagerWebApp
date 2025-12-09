"""
EISLAW Agent Orchestrator - Agent Definitions
Created by Alex (AOS-024)
Updated by Alex (AOS-026) - Langfuse tracing integration
Updated by Alex (AOS-029) - Tool execution loop

Implements Alex and Jacob agents per PRD §2.2:
- Alex: Senior Backend Engineer (Sonnet for implementation)
- Jacob: Skeptical CTO / Quality Gate (Opus for critical reviews)

Uses LangChain ChatAnthropic for LLM calls with Langfuse tracing.
"""
import os
import httpx
import subprocess
import logging
from dataclasses import dataclass, field
from typing import Optional, Callable, Any
from pathlib import Path

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from langchain_core.tools import tool

from .config import config
from .langfuse_integration import (
    create_agent_callback,
    get_langchain_callback,
    LANGFUSE_AVAILABLE,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Tool Definitions
# =============================================================================

@tool
def read_file(file_path: str) -> str:
    """
    Read contents of a file.

    Args:
        file_path: Absolute path to the file to read.

    Returns:
        File contents as string, or error message if file not found.
    """
    try:
        path = Path(file_path)
        if not path.exists():
            return f"ERROR: File not found: {file_path}"
        if not path.is_file():
            return f"ERROR: Path is not a file: {file_path}"
        return path.read_text(encoding="utf-8")
    except Exception as e:
        return f"ERROR: Failed to read file: {e}"


@tool
def edit_file(file_path: str, old_string: str, new_string: str) -> str:
    """
    Edit a file by replacing old_string with new_string.

    Args:
        file_path: Absolute path to the file to edit.
        old_string: The text to replace (must be unique in file).
        new_string: The replacement text.

    Returns:
        Success message or error message.
    """
    try:
        path = Path(file_path)
        if not path.exists():
            return f"ERROR: File not found: {file_path}"

        content = path.read_text(encoding="utf-8")

        # Check old_string is unique
        count = content.count(old_string)
        if count == 0:
            return f"ERROR: old_string not found in file"
        if count > 1:
            return f"ERROR: old_string appears {count} times, must be unique"

        # Replace
        new_content = content.replace(old_string, new_string, 1)
        path.write_text(new_content, encoding="utf-8")
        return f"SUCCESS: Replaced text in {file_path}"
    except Exception as e:
        return f"ERROR: Failed to edit file: {e}"


@tool
def curl_api(url: str, method: str = "GET", body: Optional[str] = None, headers: Optional[dict] = None) -> str:
    """
    Make an HTTP request to test an API endpoint.

    Args:
        url: The API endpoint URL (e.g., http://20.217.86.4:8799/api/health).
        method: HTTP method (GET, POST, PUT, DELETE).
        body: Optional request body as JSON string.
        headers: Optional headers as dict.

    Returns:
        Response body, status code, and headers.
    """
    try:
        with httpx.Client(timeout=30.0) as client:
            kwargs = {"url": url}
            if headers:
                kwargs["headers"] = headers
            if body:
                kwargs["content"] = body
                if "headers" not in kwargs:
                    kwargs["headers"] = {}
                kwargs["headers"]["Content-Type"] = "application/json"

            response = client.request(method.upper(), **kwargs)

            return f"""Status: {response.status_code}
Headers: {dict(response.headers)}
Body: {response.text}"""
    except Exception as e:
        return f"ERROR: Request failed: {e}"


@tool
def grep_codebase(pattern: str, path: str = "/app/backend", file_glob: str = "*.py") -> str:
    """
    Search for a pattern in the codebase.

    Args:
        pattern: Regex pattern to search for.
        path: Directory to search in.
        file_glob: File pattern to match (e.g., "*.py", "*.jsx").

    Returns:
        Matching lines with file paths and line numbers.
    """
    try:
        # Use subprocess to run grep/rg if available
        result = subprocess.run(
            ["grep", "-rn", "--include", file_glob, pattern, path],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0:
            return result.stdout or "No matches found"
        elif result.returncode == 1:
            return "No matches found"
        else:
            return f"ERROR: {result.stderr}"
    except FileNotFoundError:
        return "ERROR: grep command not available"
    except Exception as e:
        return f"ERROR: Search failed: {e}"


# =============================================================================
# Agent Definitions
# =============================================================================

@dataclass
class AgentDefinition:
    """
    Definition of an AI agent for EISLAW orchestration.

    Attributes:
        name: Agent display name (e.g., "Alex", "Jacob")
        role: Agent role description
        goal: What this agent aims to accomplish
        model: LLM model ID to use
        instructions: System prompt / instructions for the agent
        tools: List of tool functions available to the agent
        temperature: LLM temperature (lower = more deterministic)
        max_tokens: Maximum tokens in response
    """
    name: str
    role: str
    goal: str
    model: str
    instructions: str
    tools: list = field(default_factory=list)
    temperature: float = 0.2
    max_tokens: int = 8000

    def get_llm(self) -> ChatAnthropic:
        """
        Create a ChatAnthropic instance for this agent.

        Uses config.llm.anthropic_api_key from environment.
        """
        if not config.llm.has_anthropic:
            raise ValueError("ANTHROPIC_API_KEY not configured")

        return ChatAnthropic(
            model=self.model,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            api_key=config.llm.anthropic_api_key,
        )

    def _get_tool_by_name(self, name: str):
        """Find a tool by name from the tools list."""
        for tool in self.tools:
            if tool.name == name:
                return tool
        return None

    def invoke(
        self,
        task_description: str,
        task_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> str:
        """
        Execute a task using this agent with tool execution loop and Langfuse tracing.

        Args:
            task_description: The task to perform.
            task_id: Optional task ID for tracing (e.g., "CLI-009").
            session_id: Optional session ID for grouping related traces.

        Returns:
            Agent's response as string.
        """
        llm = self.get_llm()

        # Bind tools if available
        if self.tools:
            llm = llm.bind_tools(self.tools)

        messages = [
            SystemMessage(content=self.instructions),
            HumanMessage(content=task_description),
        ]

        # Create Langfuse callback for automatic tracing
        callbacks = []
        config_metadata = {}
        if LANGFUSE_AVAILABLE and task_id:
            handler, metadata = create_agent_callback(
                agent_name=self.name,
                task_id=task_id,
                session_id=session_id,
            )
            if handler:
                callbacks.append(handler)
                config_metadata = metadata
                logger.debug(f"Langfuse tracing enabled for {self.name}:{task_id}")

        # Prepare config dict for LLM invocations
        config_dict = {}
        if callbacks:
            config_dict["callbacks"] = callbacks
        if config_metadata:
            config_dict["metadata"] = config_metadata

        MAX_ITERATIONS = 10
        iteration = 0

        while iteration < MAX_ITERATIONS:
            iteration += 1

            # Invoke with callbacks and metadata for tracing
            response = llm.invoke(messages, config=config_dict)

            # Check if LLM wants to use tools
            if hasattr(response, 'tool_calls') and response.tool_calls:
                # Add AI message with tool calls to conversation
                messages.append(AIMessage(
                    content=response.content if response.content else "",
                    tool_calls=response.tool_calls
                ))

                # Execute each tool call
                for tool_call in response.tool_calls:
                    tool_name = tool_call["name"]
                    tool_args = tool_call.get("args", {})
                    tool_call_id = tool_call.get("id", "")

                    # Find and execute the tool
                    tool_fn = self._get_tool_by_name(tool_name)
                    if tool_fn:
                        try:
                            result = tool_fn.invoke(tool_args)
                        except Exception as e:
                            result = f"ERROR: Tool execution failed: {e}"
                    else:
                        result = f"ERROR: Tool '{tool_name}' not found"

                    # Add tool result to messages
                    messages.append(ToolMessage(
                        content=str(result),
                        tool_call_id=tool_call_id
                    ))
            else:
                # No tool calls - this is the final answer
                content = response.content
                if isinstance(content, list):
                    # Extract text from content blocks
                    text_parts = []
                    for block in content:
                        if isinstance(block, dict):
                            text_parts.append(block.get("text", ""))
                        elif hasattr(block, "text"):
                            text_parts.append(block.text)
                        else:
                            text_parts.append(str(block))
                    content = "".join(text_parts)
                return content

        # Max iterations reached
        return f"ERROR: Max iterations ({MAX_ITERATIONS}) reached without final answer"


# =============================================================================
# EISLAW Agent Instances
# =============================================================================

# Alex - Senior Backend Engineer
alex = AgentDefinition(
    name="Alex",
    role="Senior Backend Engineer",
    goal="Build FastAPI endpoints, implement business logic, integrate external APIs",
    model="claude-sonnet-4-5-20250929",
    instructions="""You are Alex, the Senior Backend Engineer for EISLAW.

Your responsibilities:
1. Create/modify FastAPI endpoints in backend/main.py
2. Update ai_studio_tools.py for AI agent tools
3. Implement API integrations (Airtable, SharePoint, Fillout)
4. Write helper functions in db_api_helpers.py

Rules:
- Follow existing code patterns in main.py
- Add endpoints to API_ENDPOINTS_INVENTORY.md
- Include error handling (404, 409, 500)
- Test on VM: curl -X POST http://20.217.86.4:8799/...
- Restart API after changes: docker-compose-v2 restart api

Output format:
- Code changes synced to VM
- Test results (curl commands + responses)
- Updated API_ENDPOINTS_INVENTORY.md

When you complete your task, end with:
DONE:Alex - <summary of what was accomplished>""",
    tools=[read_file, edit_file],
    temperature=0.2,
    max_tokens=8000,
)


# Jacob - Skeptical CTO / Quality Gate
jacob = AgentDefinition(
    name="Jacob",
    role="Skeptical CTO / Quality Gate",
    goal="Review all work with healthy skepticism before approval",
    model="claude-opus-4-5-20251101",  # Opus for critical reviews
    instructions="""You are Jacob, the Skeptical CTO for EISLAW.

Your responsibilities:
1. Review code changes for correctness
2. Verify claims by testing on VM
3. Check for security vulnerabilities
4. Ensure documentation is updated

Review criteria:
- Does the code do what the PRD says?
- Are there edge cases not handled?
- Is error handling complete?
- Are there security issues?
- Is the test coverage adequate?

Verdicts:
- APPROVED: Work meets all criteria
- NEEDS_FIXES: List specific issues to fix
- BLOCKED: Cannot proceed, needs escalation

Output format:
- Write review to TEAM_INBOX Messages TO Joe section
- Use format: "SKEPTICAL REVIEW - {TASK_ID}: {verdict}"

When you complete your review, end with one of:
DONE:Jacob - APPROVED: <summary>
DONE:Jacob - NEEDS_FIXES: <list of issues>
DONE:Jacob - BLOCKED: <reason>""",
    tools=[read_file, curl_api, grep_codebase],
    temperature=0.1,  # Consistent, rigorous reviews
    max_tokens=4000,
)


# =============================================================================
# Agent Registry
# =============================================================================

AGENTS: dict[str, AgentDefinition] = {
    "alex": alex,
    "jacob": jacob,
}


def get_agent(name: str) -> AgentDefinition:
    """
    Get an agent by name (case-insensitive).

    Args:
        name: Agent name (e.g., "alex", "Alex", "ALEX")

    Returns:
        AgentDefinition instance

    Raises:
        KeyError: If agent not found
    """
    key = name.lower()
    if key not in AGENTS:
        available = ", ".join(AGENTS.keys())
        raise KeyError(f"Agent '{name}' not found. Available: {available}")
    return AGENTS[key]


def list_agents() -> list[dict]:
    """
    List all available agents with their metadata.

    Returns:
        List of dicts with agent name, role, model, and tool count.
    """
    return [
        {
            "name": agent.name,
            "role": agent.role,
            "goal": agent.goal,
            "model": agent.model,
            "tools": [t.name for t in agent.tools],
            "temperature": agent.temperature,
        }
        for agent in AGENTS.values()
    ]
