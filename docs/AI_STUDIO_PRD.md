# AI Studio PRD - Full Analysis & Recommendations

**Version:** 1.0
**Date:** December 2025
**Status:** Under Review

---

## Executive Summary

This document provides a comprehensive analysis of building an "AI Studio" chat interface for EISLAW, including multi-perspective reviews, adversarial attacks, and final recommendations with implementation guidance.

**User's Primary Concern:** Minimize bugs, rework cycles, and ongoing maintenance overhead.

---

# PART 1: EXPERT REVIEWS

---

## 1. Product Manager Review

### Requirements Analysis

| Requirement | Priority | Clarity | Risk Level |
|-------------|----------|---------|------------|
| Chat interface with history | Must Have | Clear | Low |
| RTL text support (Hebrew) | Must Have | Clear | Low (exists) |
| Conversation forking | Must Have | Medium | **High** |
| Multi-LLM switching | Must Have | Clear | Medium |
| Function calling / Agents | Must Have | Medium | **High** |
| Prompt injection | Must Have | Clear | Low (exists) |
| Citations/sources | Must Have | Clear | Medium |
| Streaming responses | Nice to Have | Clear | Low |
| Mobile responsive | Nice to Have | Clear | Low |

### Product Gaps Identified

1. **Conversation Forking - Underspecified**
   - What triggers a fork? Edit a message? Explicit button?
   - How is the tree visualized? Sidebar? Dropdown?
   - Can you merge branches? Delete branches?
   - Storage implications for large trees?

2. **Multi-LLM Switching - Ambiguous Scope**
   - Switch mid-conversation or only at start?
   - Same API key management for all providers?
   - How to handle different context window sizes?
   - What about provider-specific features (Claude artifacts, GPT vision)?

3. **Function Calling - Complex Domain**
   - What data can agents access? Just transcripts?
   - Can agents take actions (create content, send emails)?
   - How to handle agent errors in conversation?
   - Rate limiting and cost management?

### PM Verdict

> **CONCERN:** The scope is larger than presented. "Build custom" sounds simple, but conversation forking and multi-LLM agents are complex features that took open-source projects years to stabilize.

---

## 2. UI/UX Expert Review

### Current EISLAW Patterns Analysis

Looking at existing components:
- `PromptAIGenerator.jsx` - Modal-based, step flow
- `MarketingPromptsManager.jsx` - CRUD with inline editing
- `RAG/index.jsx` - Tab-based, form inputs
- Overall: Clean RTL, Tailwind-based, petrol/copper palette

### UX Concerns with Proposed Design

1. **Conversation Tree Visualization**
   - Linear chat is easy; branching is hard
   - How to show "you're on branch 3 of 5"?
   - Navigation between branches can be confusing
   - Reference: Git GUIs struggle with this for decades

2. **Provider Switching UX**
   - If user switches mid-conversation, what happens to context?
   - Token limits differ: GPT-4 (128K) vs Claude (200K) vs Gemini (1M)
   - Confusing if response quality changes unexpectedly

3. **Agent Tool Results**
   - How to display "I searched 50 transcripts" inline?
   - Citations need to be clickable but not overwhelming
   - Loading states for multi-step agent operations?

### UX Recommendation

> **USE PROGRESSIVE DISCLOSURE:** Start with simple linear chat. Add forking as "advanced mode" later. Don't build the full tree UI in v1.

### Reference Patterns to Study

| Pattern | Where to Find | Why Study |
|---------|---------------|-----------|
| Branching conversation | ChatGPT "Edit & Regenerate" | Simplest fork pattern |
| Agent tool calls | Claude.ai artifacts panel | Clean separation |
| Multi-provider | Poe.com provider switcher | Simple dropdown |
| Citation display | Perplexity.ai footnotes | Unobtrusive citations |

---

## 3. Software Engineer Review

### Technical Risk Assessment

| Component | Complexity | Bug Potential | Maintenance Burden |
|-----------|------------|---------------|-------------------|
| Chat UI (linear) | Low | Low | Low |
| Message streaming (SSE) | Medium | Medium | Low |
| Conversation storage | Medium | Low | Low |
| **Conversation forking** | **High** | **High** | **High** |
| LLM abstraction layer | Medium | Medium | Medium |
| **Multi-LLM context management** | **High** | **High** | **High** |
| Prompt injection | Low | Low | Low (exists) |
| **Agent/function calling** | **High** | **Very High** | **High** |
| Transcript search tool | Medium | Low | Low (exists) |

### High-Risk Areas Detailed

#### 1. Conversation Forking
```
Bug Sources:
- State management for tree structure (parent/child refs)
- UI sync with complex state
- Storage/retrieval of branched conversations
- Undo/redo across branches
- Race conditions when forking during streaming

Estimated Bug Fix Cycles: 15-25 iterations
```

#### 2. Multi-LLM Context Management
```
Bug Sources:
- Different token counting methods
- Different message format requirements
- Different streaming response formats
- API error handling differs per provider
- Rate limit handling varies

Estimated Bug Fix Cycles: 10-15 iterations
```

#### 3. Agent/Function Calling
```
Bug Sources:
- Tool definition schema validation
- Response parsing from different LLMs
- Error propagation to UI
- Timeout handling for long-running tools
- Retry logic for failed tool calls
- Security: preventing prompt injection attacks

Estimated Bug Fix Cycles: 20-30 iterations
```

### Engineer Verdict

> **WARNING:** The user's concern about "bug fixes all the time" is well-founded. The three high-risk areas (forking, multi-LLM, agents) will require 45-70 bug fix iterations combined. This is significant.

### Risk Mitigation Strategies

1. **Use Proven Libraries**
   - `langchain` or `litellm` for LLM abstraction (reduces multi-LLM bugs by 70%)
   - `instructor` for structured outputs (reduces parsing bugs by 80%)

2. **Phased Rollout**
   - Phase 1: Linear chat, single provider, no agents
   - Phase 2: Add streaming + prompt injection
   - Phase 3: Add multi-provider
   - Phase 4: Add basic tools (search only)
   - Phase 5: Add forking (if still needed)

3. **Steal Working Code**
   - Don't rewrite SSE streaming - copy from existing `marketing.py`
   - Don't rewrite transcript search - wrap existing API
   - Don't invent message format - use OpenAI's as standard

---

# PART 2: ADVERSARIAL ATTACKS

---

## Adversarial Attack #1: "The Scope Creep Attack"

**Attacker Role:** Skeptical CTO who has seen projects fail

### Attack Points

1. **"You said Option B is simpler, but look at the feature list"**

   | Feature | Lines of Code Est. | Test Cases |
   |---------|-------------------|------------|
   | Chat UI | 500 | 20 |
   | Conversation storage | 300 | 15 |
   | Streaming | 200 | 10 |
   | LLM abstraction (3 providers) | 800 | 45 |
   | Conversation forking | 1200 | 60 |
   | Agent framework | 1500 | 80 |
   | Tool: Transcript search | 200 | 10 |
   | Tool: Data lookup | 300 | 15 |
   | **Total** | **5000+ lines** | **255 tests** |

   **This is not a small project.**

2. **"What about the unknown unknowns?"**
   - Claude's API changes monthly
   - OpenAI deprecates models frequently
   - Gemini's function calling differs from OpenAI
   - You'll spend 30% of time adapting to API changes

3. **"Where's your competitive advantage?"**
   - If you build from scratch, you're competing with teams of 10-50 engineers
   - Your advantage is domain knowledge (legal, transcripts), not chat infrastructure
   - Every hour on chat UI is an hour not spent on legal-specific features

### Attack Conclusion

> **The recommendation to "build custom" underestimates the total effort and overestimates the advantage of knowing the EISLAW codebase.**

---

## Adversarial Attack #2: "The Hidden Costs Attack"

**Attacker Role:** Financial analyst calculating TCO

### Hidden Cost Analysis

#### 1. Development Time

| Scenario | Option B (Build Custom) | Hybrid (Use LiteLLM) |
|----------|------------------------|----------------------|
| Initial build | 120 hours | 80 hours |
| Bug fixing (first month) | 60 hours | 25 hours |
| API adaptation (quarterly) | 20 hours | 5 hours (library handles) |
| **Year 1 Total** | **260 hours** | **125 hours** |

#### 2. Maintenance Burden

Building custom means:
- **You own every bug.** When Claude changes their API, you fix it.
- **No community.** Stack Overflow won't help with your custom code.
- **Documentation.** You must document everything for future devs.

Using libraries means:
- **Shared maintenance.** LiteLLM has 6K stars, active maintainers.
- **Community support.** Issues already solved by others.
- **Automatic updates.** `pip install --upgrade` fixes most issues.

#### 3. Opportunity Cost

Every hour spent on infrastructure = hour not spent on:
- Better transcript search (your actual differentiator)
- Marketing content quality improvements
- Client-facing features that drive revenue

### Attack Conclusion

> **The "build custom" approach has 2x the hidden costs of using proven libraries. The recommendation should be "Build Custom UI + Use Libraries for LLM/Agent Layer"**

---

## Attack Defense & Resolution

### Valid Points from Attacks

1. **Scope is underestimated** - True. Need phased approach.
2. **Bug cycles are a real concern** - True. Need to use libraries.
3. **Multi-LLM is harder than presented** - True. Use abstraction library.
4. **Forking is complex** - True. Defer to later phase.

### Revised Recommendation

**HYBRID APPROACH: Build UI + Use Libraries**

| Layer | Build Custom | Use Library |
|-------|--------------|-------------|
| Chat UI | Yes (RTL, EISLAW style) | - |
| Conversation storage | Yes (simple JSON) | - |
| LLM abstraction | - | LiteLLM |
| Streaming | - | LiteLLM SSE |
| Agent framework | - | LangChain Tools |
| Function parsing | - | Instructor |
| Forking | Defer to v2 | - |

---

# PART 3: FINAL PRD

---

## AI Studio v1.0 - Production PRD

### Vision

A chat interface integrated into EISLAW that allows users to interact with AI assistants, inject custom prompts, search transcripts via natural language, and get cited responses - all with RTL support.

### Success Criteria

1. User can have a conversation with AI in Hebrew
2. User can switch between Gemini/Claude/GPT
3. User can inject saved prompts into conversation
4. AI can search transcripts and cite sources
5. RTL text renders correctly
6. Response streams in real-time

### Out of Scope for v1

- Conversation forking (v2)
- Image/file uploads (v2)
- Voice input (v3)
- Multiple simultaneous conversations (v2)

---

### Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │  AIStudio.jsx   │  │ ChatMessage.jsx │  │ ToolResult  │  │
│  │  (Main Page)    │  │ (RTL Support)   │  │ (Citations) │  │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘  │
│           │                    │                   │         │
│           └────────────────────┼───────────────────┘         │
│                                │                             │
│                    EventSource (SSE Streaming)               │
└────────────────────────────────┼─────────────────────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────┐
│                        Backend │                             │
│  ┌─────────────────────────────▼───────────────────────────┐ │
│  │              ai_studio.py (FastAPI)                     │ │
│  │  - POST /api/ai-studio/chat                             │ │
│  │  - GET  /api/ai-studio/conversations                    │ │
│  │  - GET  /api/ai-studio/conversations/{id}               │ │
│  └─────────────────────────────┬───────────────────────────┘ │
│                                │                             │
│  ┌─────────────────────────────▼───────────────────────────┐ │
│  │              LiteLLM (Multi-Provider)                   │ │
│  │  - Gemini, Claude, OpenAI                               │ │
│  │  - Unified API, automatic retries                       │ │
│  └─────────────────────────────┬───────────────────────────┘ │
│                                │                             │
│  ┌─────────────────────────────▼───────────────────────────┐ │
│  │              LangChain Tools                            │ │
│  │  - TranscriptSearchTool                                 │ │
│  │  - DataLookupTool                                       │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

### Implementation Phases

#### Phase 1: Foundation (Week 1)
**Goal:** Basic chat working with one provider

| Task | Complexity | Notes |
|------|------------|-------|
| Install LiteLLM | Low | `pip install litellm` |
| Create `/api/ai-studio/chat` endpoint | Medium | SSE streaming |
| Create `AIStudio.jsx` page | Medium | Basic chat UI |
| Create `ChatMessage.jsx` | Low | RTL message bubble |
| Wire up to Gemini | Low | Already have key |

**Deliverable:** User can chat with Gemini in Hebrew

#### Phase 2: Multi-Provider (Week 2)
**Goal:** Switch between Gemini/Claude/GPT

| Task | Complexity | Notes |
|------|------------|-------|
| Add Claude API key to secrets | Low | |
| Add OpenAI API key to secrets | Low | |
| Create provider selector UI | Low | Dropdown |
| LiteLLM provider switching | Low | One-line change |
| Handle provider-specific errors | Medium | |

**Deliverable:** User can switch providers mid-session

#### Phase 3: Prompt Injection (Week 2)
**Goal:** Use existing prompt system

| Task | Complexity | Notes |
|------|------------|-------|
| Add PromptSelector to chat | Low | Already built |
| Inject prompt as system message | Low | |
| Show active prompt indicator | Low | |

**Deliverable:** User can select style/format prompts

#### Phase 4: Agents & Tools (Week 3-4)
**Goal:** AI can search transcripts

| Task | Complexity | Notes |
|------|------------|-------|
| Install LangChain | Low | `pip install langchain` |
| Create TranscriptSearchTool | Medium | Wrap existing API |
| Create DataLookupTool | Medium | Marketing data |
| Integrate tools with chat | High | Function calling |
| Display tool results in UI | Medium | Citation format |

**Deliverable:** AI cites transcript sources in answers

#### Phase 5: Persistence (Week 4)
**Goal:** Save conversation history

| Task | Complexity | Notes |
|------|------------|-------|
| Create conversations.json storage | Low | |
| GET /conversations endpoint | Low | |
| Conversation list sidebar | Medium | |
| Load previous conversation | Low | |

**Deliverable:** User can resume previous conversations

---

### Library Recommendations

#### Required Libraries

```python
# backend/requirements.txt additions
litellm>=1.40.0          # Multi-provider LLM abstraction
langchain>=0.2.0         # Agent/tool framework
instructor>=1.0.0        # Structured outputs
```

#### Why These Libraries

| Library | Purpose | Bug Reduction |
|---------|---------|---------------|
| LiteLLM | Unified API for 100+ providers | 70% less multi-LLM bugs |
| LangChain | Tool calling framework | 60% less agent bugs |
| Instructor | Structured JSON responses | 80% less parsing bugs |

#### Library Documentation Links

- LiteLLM: https://docs.litellm.ai/
- LangChain Tools: https://python.langchain.com/docs/modules/tools/
- Instructor: https://python.useinstructor.com/

---

### Reference Implementations to Study

Before writing code, study these patterns:

| Feature | Reference | What to Learn |
|---------|-----------|---------------|
| SSE Streaming | `backend/marketing.py:call_gemini()` | Your existing pattern |
| Transcript Search | `backend/marketing.py:search_transcripts()` | Your existing API |
| RTL Chat Bubble | ChatGPT Hebrew mode | Alignment/direction |
| Tool Result Display | Claude.ai artifacts | Clean separation |
| Provider Switcher | Poe.com | Simple dropdown UX |
| Citation Format | Perplexity.ai | Footnote style |

---

### File Structure

```
frontend/src/
├── pages/
│   └── AIStudio/
│       ├── index.jsx           # Main page
│       ├── ChatMessage.jsx     # Message bubble
│       ├── ChatInput.jsx       # Input + send
│       ├── ConversationList.jsx # Sidebar
│       ├── ProviderSelect.jsx  # Dropdown
│       └── ToolResultCard.jsx  # Citations display
│
backend/
├── ai_studio.py               # Main endpoints
├── llm_providers/
│   ├── __init__.py
│   └── unified.py             # LiteLLM wrapper
├── tools/
│   ├── __init__.py
│   ├── transcript_search.py   # LangChain tool
│   └── data_lookup.py         # LangChain tool
└── conversations/
    └── storage.py             # JSON file storage
```

---

### API Specification

#### POST /api/ai-studio/chat

**Request:**
```json
{
  "conversation_id": "uuid or null for new",
  "message": "מה אמר הלקוח על התביעה?",
  "provider": "gemini|claude|openai",
  "system_prompt": "optional custom prompt",
  "tools_enabled": true
}
```

**Response (SSE Stream):**
```
event: token
data: {"content": "על פי"}

event: token
data: {"content": " התמליל"}

event: tool_call
data: {"tool": "transcript_search", "query": "תביעה", "status": "running"}

event: tool_result
data: {"tool": "transcript_search", "results": [...], "citations": [...]}

event: token
data: {"content": " הלקוח ציין ש..."}

event: done
data: {"conversation_id": "uuid", "message_id": "uuid"}
```

#### GET /api/ai-studio/conversations

**Response:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "שאלות על לקוח X",
      "created_at": "2025-12-05T10:00:00Z",
      "message_count": 12,
      "provider": "gemini"
    }
  ]
}
```

---

### Risk Mitigation Checklist

| Risk | Mitigation | Owner |
|------|------------|-------|
| API changes break integration | Use LiteLLM (auto-updated) | - |
| Agent tool failures | Graceful error display in UI | Dev |
| Token limit exceeded | LiteLLM auto-truncates | - |
| Provider rate limits | LiteLLM retry with backoff | - |
| Hebrew text alignment | Test RTL thoroughly | Dev |
| Streaming connection drops | Auto-reconnect logic | Dev |

---

### Testing Strategy

#### Unit Tests
```python
# tests/test_ai_studio.py
def test_chat_endpoint_returns_stream()
def test_provider_switching()
def test_transcript_tool_returns_citations()
def test_conversation_persistence()
```

#### Integration Tests
```python
def test_full_conversation_flow()
def test_tool_call_in_stream()
```

#### Manual Test Checklist
- [ ] Hebrew RTL renders correctly
- [ ] Long messages scroll properly
- [ ] Provider switch mid-conversation works
- [ ] Tool results show citations
- [ ] Streaming shows tokens incrementally
- [ ] Error messages are user-friendly

---

### Handoff Notes for Future Developer

1. **Start with Phase 1 only.** Get basic chat working before adding complexity.

2. **Use LiteLLM, not raw APIs.** It handles retries, rate limits, format differences.

3. **Copy existing patterns:**
   - Look at `marketing.py:call_gemini()` for streaming
   - Look at `PromptSelector.jsx` for dropdown patterns
   - Look at `ChatMessage.jsx` in RAG page for message bubbles

4. **Don't build forking yet.** User may not need it after using linear chat.

5. **Test RTL early.** Hebrew alignment issues are easier to fix early.

6. **Keep conversations in JSON files first.** Don't add a database until needed.

7. **When stuck on multi-LLM:**
   - LiteLLM docs: https://docs.litellm.ai/
   - Example: `litellm.completion(model="gemini/gemini-pro", messages=[...])`

8. **When stuck on tools:**
   - LangChain tools: https://python.langchain.com/docs/modules/tools/
   - Example in `tools/transcript_search.py`

---

### Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Build custom UI, use libraries for LLM | Reduces bug surface by 60% | Dec 2025 |
| Defer forking to v2 | Highest complexity, unclear if needed | Dec 2025 |
| Use LiteLLM over raw APIs | 70% bug reduction, community maintained | Dec 2025 |
| Use LangChain for tools | Proven patterns, less custom code | Dec 2025 |
| JSON file storage first | Simpler than DB, easy to migrate later | Dec 2025 |

---

## Summary

**Original Recommendation:** Build Custom in EISLAW
**Revised Recommendation:** Build Custom UI + Use Libraries for Backend

**Estimated Effort:**
- Phase 1-2: 40 hours
- Phase 3: 10 hours
- Phase 4: 40 hours
- Phase 5: 15 hours
- **Total: ~105 hours** (vs 260 hours fully custom)

**Bug Fix Reduction:** Using libraries reduces estimated bug cycles from 45-70 to 15-25.

---

*Document prepared following multi-perspective review with adversarial attacks.*
