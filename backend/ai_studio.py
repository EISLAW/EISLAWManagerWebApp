"""
AI Studio Module - Chat interface with multi-provider LLM support
Provides SSE streaming, conversation management, and tool integration.
"""
import json
import uuid
import os
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any, AsyncGenerator
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# Import tools module
try:
    from backend.ai_studio_tools import AVAILABLE_TOOLS, execute_tool, get_tools_for_llm
    TOOLS_AVAILABLE = True
except ImportError:
    TOOLS_AVAILABLE = False
    AVAILABLE_TOOLS = []
    def execute_tool(name, args): return {"error": "Tools not available"}
    def get_tools_for_llm(): return []

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────

# Provider model mappings
PROVIDER_MODELS = {
    "gemini": "gemini/gemini-2.0-flash",
    "claude": "anthropic/claude-sonnet-4-20250514",
    "openai": "gpt-4o-mini",
}

DEFAULT_SYSTEM_PROMPT = """אתה עוזר AI מועיל שעונה בעברית.
אתה מסייע למשתמשים במערכת EISLAW - מערכת לניהול משרד עורכי דין.
ענה בצורה מקצועית, ברורה ותמציתית."""

TOOLS_SYSTEM_PROMPT = """אתה עוזר AI מועיל שעונה בעברית ויכול לבצע פעולות במערכת EISLAW.
אתה מסייע למשתמשים במערכת EISLAW - מערכת לניהול משרד עורכי דין.

יש לך גישה לכלים הבאים:
- search_clients: חיפוש לקוחות לפי שם, אימייל או טלפון
- get_client_details: קבלת פרטים מלאים על לקוח
- search_tasks: חיפוש משימות לפי כותרת, לקוח או סטטוס
- create_task: יצירת משימה חדשה
- update_task_status: עדכון סטטוס משימה
- get_system_summary: סיכום מצב המערכת

כשמשתמש מבקש לבצע פעולה או לקבל מידע, השתמש בכלים המתאימים.
לאחר שימוש בכלי, הסבר למשתמש את התוצאה בצורה ברורה.
ענה בצורה מקצועית, ברורה ותמציתית."""

# ─────────────────────────────────────────────────────────────
# Storage
# ─────────────────────────────────────────────────────────────

def get_ai_studio_dir() -> Path:
    """Get the AI Studio data directory."""
    if os.path.exists("/app/data"):
        base = Path("/app/data/ai_studio")
    else:
        base = Path(__file__).resolve().parent.parent / "data" / "ai_studio"
    base.mkdir(parents=True, exist_ok=True)
    return base


def load_conversations() -> List[dict]:
    """Load all conversations."""
    conv_file = get_ai_studio_dir() / "conversations.json"
    if not conv_file.exists():
        return []
    try:
        return json.loads(conv_file.read_text("utf-8"))
    except Exception:
        return []


def save_conversations(conversations: List[dict]):
    """Save conversations list."""
    conv_file = get_ai_studio_dir() / "conversations.json"
    conv_file.write_text(json.dumps(conversations, ensure_ascii=False, indent=2), "utf-8")


def get_conversation(conversation_id: str) -> Optional[dict]:
    """Get a single conversation by ID."""
    conversations = load_conversations()
    for conv in conversations:
        if conv.get("id") == conversation_id:
            return conv
    return None


def save_conversation(conversation: dict):
    """Save or update a single conversation."""
    conversations = load_conversations()
    found = False
    for i, conv in enumerate(conversations):
        if conv.get("id") == conversation.get("id"):
            conversations[i] = conversation
            found = True
            break
    if not found:
        conversations.append(conversation)
    save_conversations(conversations)


# ─────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role: user, assistant, or system")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = Field(None, description="Conversation ID or null for new")
    message: str = Field(..., description="User message")
    provider: str = Field("gemini", description="AI provider: gemini, claude, openai")
    system_prompt: Optional[str] = Field(None, description="Optional custom system prompt")
    tools_enabled: bool = Field(False, description="Enable tool calling")


class ConversationSummary(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int
    provider: str


# ─────────────────────────────────────────────────────────────
# Router
# ─────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/ai-studio", tags=["AI Studio"])


# ─────────────────────────────────────────────────────────────
# LiteLLM Integration
# ─────────────────────────────────────────────────────────────

async def stream_chat_response(
    messages: List[Dict[str, str]],
    provider: str,
    system_prompt: str
) -> AsyncGenerator[str, None]:
    """Stream chat response from LLM provider using LiteLLM."""
    try:
        import litellm

        # Configure API keys from environment
        litellm.api_key = os.environ.get("OPENAI_API_KEY")

        # Set provider-specific keys
        if provider == "gemini":
            os.environ["GEMINI_API_KEY"] = os.environ.get("GEMINI_API_KEY", "")
        elif provider == "claude":
            os.environ["ANTHROPIC_API_KEY"] = os.environ.get("ANTHROPIC_API_KEY", "")

        # Get model name
        model = PROVIDER_MODELS.get(provider, PROVIDER_MODELS["gemini"])

        # Prepare messages with system prompt
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        # Stream response
        response = await litellm.acompletion(
            model=model,
            messages=full_messages,
            stream=True,
            temperature=0.7,
            max_tokens=4096,
        )

        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                yield f"event: token\ndata: {json.dumps({'content': content}, ensure_ascii=False)}\n\n"

        yield f"event: done\ndata: {json.dumps({'status': 'complete'})}\n\n"

    except ImportError:
        yield f"event: error\ndata: {json.dumps({'error': 'LiteLLM not installed'})}\n\n"
    except Exception as e:
        error_msg = str(e)
        if "API key" in error_msg.lower():
            error_msg = f"API key not configured for {provider}"
        yield f"event: error\ndata: {json.dumps({'error': error_msg})}\n\n"


async def stream_chat_with_tools(
    messages: List[Dict[str, str]],
    provider: str,
    system_prompt: str
) -> AsyncGenerator[str, None]:
    """
    Stream chat response with tool calling support.
    Handles the tool calling loop: LLM -> Tool -> LLM -> Response
    """
    try:
        import litellm

        # Get model name
        model = PROVIDER_MODELS.get(provider, PROVIDER_MODELS["gemini"])

        # Prepare messages with system prompt
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        # Get tool definitions
        tools = get_tools_for_llm()

        # Maximum tool call iterations to prevent infinite loops
        max_iterations = 5
        iteration = 0

        while iteration < max_iterations:
            iteration += 1

            # Make LLM call with tools
            response = await litellm.acompletion(
                model=model,
                messages=full_messages,
                tools=tools if tools else None,
                tool_choice="auto" if tools else None,
                temperature=0.7,
                max_tokens=4096,
            )

            choice = response.choices[0]
            message = choice.message

            # Check if the model wants to call tools
            if message.tool_calls:
                # Process each tool call
                for tool_call in message.tool_calls:
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)

                    # Emit tool_call event
                    yield f"event: tool_call\ndata: {json.dumps({'tool': tool_name, 'arguments': tool_args}, ensure_ascii=False)}\n\n"

                    # Execute the tool
                    tool_result = execute_tool(tool_name, tool_args)

                    # Emit tool_result event
                    yield f"event: tool_result\ndata: {json.dumps({'tool': tool_name, 'result': tool_result}, ensure_ascii=False)}\n\n"

                    # Add tool call and result to messages for next iteration
                    full_messages.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": tool_call.id,
                                "type": "function",
                                "function": {
                                    "name": tool_name,
                                    "arguments": json.dumps(tool_args)
                                }
                            }
                        ]
                    })
                    full_messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(tool_result, ensure_ascii=False)
                    })

                # Continue loop to let LLM process tool results
                continue

            # No tool calls - stream the final response
            if message.content:
                # For non-streaming final response, emit as single token
                yield f"event: token\ndata: {json.dumps({'content': message.content}, ensure_ascii=False)}\n\n"

            # Exit the loop
            break

        yield f"event: done\ndata: {json.dumps({'status': 'complete', 'tools_used': iteration > 1})}\n\n"

    except ImportError:
        yield f"event: error\ndata: {json.dumps({'error': 'LiteLLM not installed'})}\n\n"
    except Exception as e:
        error_msg = str(e)
        if "API key" in error_msg.lower():
            error_msg = f"API key not configured for {provider}"
        yield f"event: error\ndata: {json.dumps({'error': error_msg})}\n\n"


# ─────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat(request: ChatRequest):
    """
    Chat endpoint with SSE streaming.
    Returns a stream of events: token, tool_call, tool_result, error, done.
    """
    # Get or create conversation
    conversation_id = request.conversation_id or str(uuid.uuid4())
    conversation = get_conversation(conversation_id)

    if not conversation:
        # Create new conversation
        conversation = {
            "id": conversation_id,
            "title": request.message[:50] + "..." if len(request.message) > 50 else request.message,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "provider": request.provider,
            "system_prompt": request.system_prompt or DEFAULT_SYSTEM_PROMPT,
            "messages": []
        }

    # Add user message
    conversation["messages"].append({
        "role": "user",
        "content": request.message,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })

    # Prepare messages for LLM
    llm_messages = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in conversation["messages"]
    ]

    # Select system prompt based on tools mode
    if request.tools_enabled and TOOLS_AVAILABLE:
        system_prompt = request.system_prompt or TOOLS_SYSTEM_PROMPT
    else:
        system_prompt = request.system_prompt or conversation.get("system_prompt", DEFAULT_SYSTEM_PROMPT)

    async def generate():
        full_response = ""
        tool_calls_made = []

        # Choose the appropriate streaming function
        if request.tools_enabled and TOOLS_AVAILABLE:
            stream_fn = stream_chat_with_tools(llm_messages, request.provider, system_prompt)
        else:
            stream_fn = stream_chat_response(llm_messages, request.provider, system_prompt)

        async for event in stream_fn:
            # Accumulate response content
            if event.startswith("event: token"):
                try:
                    data_line = event.split("\n")[1]
                    data = json.loads(data_line.replace("data: ", ""))
                    full_response += data.get("content", "")
                except:
                    pass
            # Track tool calls for conversation history
            elif event.startswith("event: tool_call"):
                try:
                    data_line = event.split("\n")[1]
                    data = json.loads(data_line.replace("data: ", ""))
                    tool_calls_made.append(data)
                except:
                    pass
            yield event

        # Save assistant response to conversation
        if full_response or tool_calls_made:
            message_data = {
                "role": "assistant",
                "content": full_response,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            if tool_calls_made:
                message_data["tool_calls"] = tool_calls_made

            conversation["messages"].append(message_data)
            conversation["updated_at"] = datetime.utcnow().isoformat() + "Z"
            save_conversation(conversation)

        # Send conversation ID at the end
        yield f"event: conversation\ndata: {json.dumps({'conversation_id': conversation_id})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/conversations")
async def list_conversations():
    """List all conversations."""
    conversations = load_conversations()
    summaries = []

    for conv in conversations:
        summaries.append({
            "id": conv.get("id"),
            "title": conv.get("title", "שיחה ללא כותרת"),
            "created_at": conv.get("created_at"),
            "updated_at": conv.get("updated_at"),
            "message_count": len(conv.get("messages", [])),
            "provider": conv.get("provider", "gemini"),
        })

    # Sort by updated_at descending
    summaries.sort(key=lambda x: x.get("updated_at", ""), reverse=True)

    return {"conversations": summaries}


@router.get("/conversations/{conversation_id}")
async def get_conversation_detail(conversation_id: str):
    """Get a single conversation with all messages."""
    conversation = get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation."""
    conversations = load_conversations()
    conversations = [c for c in conversations if c.get("id") != conversation_id]
    save_conversations(conversations)
    return {"status": "deleted"}


@router.get("/providers")
async def list_providers():
    """List available AI providers."""
    providers = []

    # Check which providers have API keys configured
    if os.environ.get("GEMINI_API_KEY"):
        providers.append({
            "id": "gemini",
            "name": "Google Gemini",
            "model": "gemini-2.0-flash",
            "available": True
        })
    else:
        providers.append({
            "id": "gemini",
            "name": "Google Gemini",
            "model": "gemini-2.0-flash",
            "available": False
        })

    if os.environ.get("ANTHROPIC_API_KEY"):
        providers.append({
            "id": "claude",
            "name": "Anthropic Claude",
            "model": "claude-sonnet-4-20250514",
            "available": True
        })
    else:
        providers.append({
            "id": "claude",
            "name": "Anthropic Claude",
            "model": "claude-sonnet-4-20250514",
            "available": False
        })

    if os.environ.get("OPENAI_API_KEY"):
        providers.append({
            "id": "openai",
            "name": "OpenAI",
            "model": "gpt-4o-mini",
            "available": True
        })
    else:
        providers.append({
            "id": "openai",
            "name": "OpenAI",
            "model": "gpt-4o-mini",
            "available": False
        })

    return {"providers": providers}


@router.get("/tools")
async def list_tools():
    """List available AI tools."""
    if not TOOLS_AVAILABLE:
        return {"tools": [], "available": False}

    tools = []
    for tool in AVAILABLE_TOOLS:
        func = tool.get("function", {})
        tools.append({
            "name": func.get("name"),
            "description": func.get("description"),
            "parameters": func.get("parameters", {}).get("properties", {})
        })

    return {"tools": tools, "available": True}
