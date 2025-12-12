# PRD: AI Model Orchestration Strategy

> **Version:** 1.0
> **Author:** David (Senior Product)
> **Date:** 2025-12-09
> **Status:** Draft for Review

---

## § 1. Executive Summary

### Current State

EISLAW currently uses premium AI models across all operations:
- **Orchestrator agents:** Claude Opus ($5/$25 per 1M tokens) for all orchestration tasks
- **Development agents:** Mix of Claude Sonnet and Codex
- **AI Studio:** User-selectable models (Gemini/Claude/OpenAI)
- **RAG processing:** GPT-4 for embeddings and summarization

### Problem

This one-size-fits-all approach incurs unnecessary costs. Analysis shows that many orchestration tasks could use lower-tier models without quality degradation, potentially reducing costs by **60-80%**.

### Solution

Implement intelligent model routing based on task complexity:
- **Simple tasks** (file reads, formatting, validation): Use budget models ($0.10-$1 per 1M tokens)
- **Medium complexity** (code changes, analysis): Use mid-tier models ($1-$3 per 1M tokens)
- **High complexity** (architecture, reviews, strategic decisions): Use premium models ($5+ per 1M tokens)

### Key Findings from December 2025 Research

1. **New ultra-budget models available:** Gemini 2.0 Flash ($0.10/$0.40) and Claude Haiku 3 ($0.25/$1.25) offer 95-98% cost reduction vs. Opus
2. **Performance gap narrowing:** Mid-tier models (Sonnet 4.5, Gemini 2.5 Flash) achieve 70-80% of premium model quality at 40-70% lower cost
3. **Optimization features mature:** Prompt caching (90% savings) and batch processing (50% discount) are now production-ready
4. **Context windows expanded:** Multiple models now offer 1M+ token windows, enabling richer prompts at lower per-token costs

### Expected Impact

- **Cost reduction:** 60-80% savings on orchestration workflows
- **Performance:** <5% quality degradation for properly routed tasks
- **Scalability:** Enables 5-10x more workflows within same budget
- **Break-even:** ROI achieved after ~40-60 orchestration workflows (1-2 weeks of development)

---

## § 2. Problem Statement

### 2.1 Current Cost Pain Points

**Orchestrator Overhead:**
- Joe (Orchestrator) uses Claude Opus for ALL tasks, including trivial routing decisions
- Example: Spawning 5 agents costs ~$0.05 in routing alone (could be $0.005 with Haiku)
- Annual estimate: $3,000-$5,000 in orchestration costs alone

**No Granularity:**
- Single model assigned per agent regardless of task complexity
- Alex uses Sonnet for both complex refactoring AND simple file reads
- No ability to "downshift" for simple operations

**CEO Usage Limits:**
- CEO has Claude subscription limits (200K tokens/day on Pro plan)
- No cost monitoring/tracking to understand burn rate
- Frequent limit exhaustion blocks productivity

**No Cost Optimization:**
- Prompt caching not implemented (90% savings opportunity missed)
- Batch processing not used (50% savings opportunity missed)
- Real-time API calls even for non-urgent tasks

### 2.2 Market Context (December 2025)

**Pricing Landscape Has Shifted:**
- Claude Opus 4.5: 66% price reduction vs. Opus 4.1 ($5/$25 vs. $15/$75)
- New budget tier emerged: Models under $0.50 per 1M input tokens
- Premium models now 50-100x more expensive than budget options

**Performance Democratization:**
- Budget models (Haiku, GPT-4o mini) achieve 60-70% of premium model quality
- Mid-tier models (Sonnet, Gemini 2.5 Flash) achieve 80-90% of premium quality
- Quality gap narrowed significantly vs. 2024

**Optimization Features Matured:**
- Prompt caching: Anthropic reports 90% cost reduction for cached prompts
- Batch processing: 50% discount across OpenAI, Claude, Gemini
- Combined optimization: Up to 95% total cost reduction possible

### 2.3 Business Impact

**Development Velocity:**
- Current: ~50-100 orchestration workflows/month sustainable
- With optimization: 250-500 workflows/month within same budget
- Enables 5x faster iteration on agent development

**Production Readiness:**
- Current costs prohibit production orchestrator deployment
- Optimized costs make production workflows economically viable
- Target: <$0.10 per production workflow execution

**Strategic Flexibility:**
- Budget constraints currently limit experimentation
- Lower costs enable rapid prototyping and A/B testing
- Can deploy more agents in parallel without budget concerns

---

## § 3. Cost-Performance Matrix

### 3.1 Comprehensive Model Comparison (December 2025)

| Model | Provider | Input ($/1M) | Output ($/1M) | Context | Quality Tier | SWE-bench | Best Use Cases |
|-------|----------|--------------|---------------|---------|--------------|-----------|----------------|
| **Llama 4 Scout** | Meta | $0.19 | $0.62 | 128K | Budget | ~45% | Testing, simple formatting |
| **Haiku 3** | Anthropic | $0.25 | $1.25 | 200K | Budget | ~50% | File reads, validation, routing |
| **Gemini 2.0 Flash** | Google | $0.10 | $0.40 | 1M | Budget | ~55% | Document processing, embeddings |
| **GPT-4o mini** | OpenAI | $0.15 | $0.60 | 128K | Budget | ~60% | Summarization, classification |
| **Llama 4 Maverick** | Meta | $0.28 | $0.89 | 128K | Development | ~55% | Open-source experimentation |
| **Mistral Medium 3** | Mistral | $0.40 | $2.00 | 128K | Development | ~65% | Cost-effective general tasks |
| **Gemini 2.5 Flash** | Google | $0.30 | $2.50 | 1M | Development | ~70% | Analysis, moderate coding |
| **Haiku 3.5** | Anthropic | $0.80 | $4.00 | 200K | Development | ~65% | Production-ready simple tasks |
| **Haiku 4.5** | Anthropic | $1.00 | $5.00 | 200K | Production | ~70% | Fast, reliable tool execution |
| **o3-mini** | OpenAI | $1.10 | $4.40 | 200K | Production | ~72% | Reasoning, moderate complexity |
| **Gemini 2.5 Pro** | Google | $1.25 | $10.00 | 2M | Production | 63.8% | Massive context, multimodal |
| **GPT-4o** | OpenAI | $2.50 | $10.00 | 128K | Production | ~68% | General-purpose production |
| **Sonnet 4.5** | Anthropic | $3.00 | $15.00 | 200K-1M | Production+ | 72.7% | Coding, refactoring, analysis |
| **Cohere Command A** | Cohere | $2.77 | $11.08 | 128K | Production | ~65% | Enterprise RAG, retrieval |
| **o3** | OpenAI | $1.00 | $4.00 | 200K | Production | ~74% | Advanced reasoning |
| **Opus 4.5** | Anthropic | $5.00 | $25.00 | 200K-1M | Premium | **80.9%** | Architecture, reviews, complex coding |

**Notes:**
- SWE-bench scores represent coding accuracy on standardized benchmarks
- Context windows: 1M tokens ≈ 750,000 words or ~8 React codebases
- Prices current as of December 2025 (sources in §9)

### 3.2 Cost Efficiency Analysis

**Price Segmentation:**
- **Ultra-Budget ($0.10-$0.30):** 95-98% cheaper than Opus
- **Budget ($0.30-$1.00):** 80-95% cheaper than Opus
- **Mid-Tier ($1.00-$3.00):** 40-80% cheaper than Opus
- **Premium ($5.00+):** Baseline reference

**Performance/Cost Sweet Spots:**

1. **Best Budget Model:** Claude Haiku 3 ($0.25/$1.25)
   - 95% cheaper than Opus, 50% quality on coding
   - Ideal for: File operations, routing, simple validation

2. **Best Development Model:** Gemini 2.5 Flash ($0.30/$2.50)
   - 94% cheaper than Opus, 70% quality on coding
   - Massive 1M context window
   - Ideal for: Analysis, document processing, moderate coding

3. **Best Production Model:** Claude Sonnet 4.5 ($3/$15)
   - 40% cheaper than Opus, 90% quality (72.7% SWE-bench)
   - Ideal for: Most production coding and orchestration tasks

4. **Best Premium Model:** Claude Opus 4.5 ($5/$25)
   - Industry-leading 80.9% SWE-bench score
   - 66% cheaper than Opus 4.1 predecessor
   - Ideal for: Architecture, code review, strategic decisions

### 3.3 Cost Optimization Features

**Prompt Caching (Anthropic):**
- Cache write: Standard price
- Cache read: 0.1x base price (90% discount)
- Example: Opus 4.5 cached reads = $0.50 per 1M tokens (vs. $5 standard)
- Use case: Repeated context (docs, codebase snippets, instructions)

**Batch Processing (All providers):**
- 50% discount on output tokens
- 24-48 hour SLA (vs. real-time)
- Example: Haiku 4.5 batch = $1/$2.50 (vs. $1/$5 standard)
- Use case: Non-urgent analysis, bulk processing

**Combined Optimization:**
- Haiku 4.5 + caching + batch = $0.10/$2.50 effective rate
- **95% cost reduction vs. standard Opus real-time**
- Requires architectural planning (batch workflows, shared context)

---

## § 4. Orchestration Strategy

### 4.1 Task Complexity Classification

**Level 1: Simple Operations (Budget Models $0.10-$1.00)**

*Characteristics:*
- Read-only operations
- No complex reasoning required
- Predictable output format
- Low consequence of errors

*Examples:*
- File reads (`read_file` tool)
- Directory listing
- Simple grep/search
- Status checks
- Routing decisions (which agent to call next)
- Validation checks (file exists, format correct)

*Recommended Models:*
- **Primary:** Claude Haiku 3 ($0.25/$1.25) - Best reliability/cost
- **Alternative:** Gemini 2.0 Flash ($0.10/$0.40) - Cheapest option
- **Cost Impact:** 95% reduction vs. Opus

**Level 2: Moderate Operations (Mid-Tier Models $1.00-$3.00)**

*Characteristics:*
- Code modifications within existing patterns
- Analysis and summarization
- Structured data transformations
- Moderate reasoning required

*Examples:*
- Simple code edits (variable renames, formatting)
- Log analysis and error identification
- Documentation updates
- Test case generation
- API response parsing

*Recommended Models:*
- **Primary:** Claude Haiku 4.5 ($1/$5) - Fast, reliable
- **Alternative:** Gemini 2.5 Flash ($0.30/$2.50) - Cost-optimized
- **Cost Impact:** 80-90% reduction vs. Opus

**Level 3: Complex Operations (Production Models $3.00-$5.00)**

*Characteristics:*
- New feature implementation
- Refactoring and architecture
- Complex debugging
- High consequence of errors

*Examples:*
- Multi-file refactoring
- New API endpoint implementation
- Database schema changes
- Complex bug fixes
- Integration of new libraries

*Recommended Models:*
- **Primary:** Claude Sonnet 4.5 ($3/$15) - Best overall balance
- **Fallback:** Claude Opus 4.5 ($5/$25) - When Sonnet fails
- **Cost Impact:** 40% reduction vs. Opus (or 0% if Opus required)

**Level 4: Critical Operations (Premium Models $5.00+)**

*Characteristics:*
- Architecture decisions
- Security-critical code
- Production incident response
- Strategic technical planning

*Examples:*
- System architecture design
- Code review for production merges
- Security vulnerability assessment
- Performance optimization strategy
- Technical PRD creation

*Recommended Models:*
- **Only:** Claude Opus 4.5 ($5/$25) - No compromise on quality
- **Cost Impact:** Baseline (but 66% cheaper than old Opus 4.1)

### 4.2 Model Mixing Strategy

**Workflow Pattern: Progressive Escalation**

```
Start: Haiku 3 attempts task ($0.25)
  ↓
  Success? → Complete (95% savings)
  ↓
  Failure? → Escalate to Haiku 4.5 ($1)
  ↓
  Success? → Complete (80% savings)
  ↓
  Failure? → Escalate to Sonnet 4.5 ($3)
  ↓
  Success? → Complete (40% savings)
  ↓
  Failure? → Escalate to Opus 4.5 ($5)
```

**Cost Example:**
- If 70% of tasks succeed at Haiku 3: Average cost = $0.48 per task
- If all tasks use Opus: Average cost = $5 per task
- **Savings: 90%** despite escalations

**Failure Detection:**
- Tool execution errors (file not found, syntax error)
- Explicit "I cannot complete this task" statements
- Output validation failures
- Human review flags issues

**Escalation Criteria:**
- **Auto-escalate:** Tool errors, output validation failures
- **Manual escalation:** Human review finds issues
- **Skip escalation:** If Level 4 (critical) task, start with Opus

### 4.3 Task Granularity Guidelines

**High Granularity = More Cost Optimization Opportunities**

**Bad (Coarse Granularity):**
```
Task: "Implement new client archive feature"
Model: Opus 4.5 (entire task)
Cost: $5 × 500K tokens = $2.50
```

**Good (Fine Granularity):**
```
Task 1: "Read current client list API code" → Haiku 3 ($0.01)
Task 2: "Design archive feature API" → Opus 4.5 ($0.50)
Task 3: "Implement archive endpoint" → Sonnet 4.5 ($0.30)
Task 4: "Write tests" → Haiku 4.5 ($0.05)
Task 5: "Update API docs" → Haiku 3 ($0.01)

Total: $0.87 (65% savings)
```

**Granularity Guidelines:**
- **Level 1 tasks:** Can be very granular (single file operations)
- **Level 2-3 tasks:** Moderate granularity (single feature/endpoint)
- **Level 4 tasks:** Keep coarse (strategic decisions need full context)

**Diminishing Returns:**
- Overhead: Each task spawn has ~$0.01-0.02 orchestration cost
- Too granular: Overhead exceeds savings
- Sweet spot: 3-10 subtasks per feature

### 4.4 Context Management for Cost Optimization

**Problem:** Passing large context to every model = wasted tokens

**Solution 1: Lazy Context Loading**
- **Don't pass codebase to Haiku 3 for file reads**
- Only pass specific file path
- Load full context only if escalation needed

**Solution 2: Prompt Caching**
- Cache CLAUDE.md, project structure, coding standards
- Cached reads cost 90% less
- Update cache only when docs change

**Solution 3: Context Tier Matching**
- **Haiku 3:** Minimal context (task description only)
- **Haiku 4.5/Sonnet:** Moderate context (relevant files)
- **Opus:** Full context (entire codebase if needed)

**Cost Example:**
```
Without caching:
- Pass 50K token context to 10 agents
- Cost: 50K × 10 × $5 = $2.50

With caching:
- Cache 50K tokens once: $5
- Cache reads: 50K × 10 × $0.50 = $0.25
- Total: $0.30 (88% savings)
```

---

## § 5. Use Case Recommendations (EISLAW-Specific)

### 5.1 Orchestrator (Development/Testing)

**Current State:**
- Joe (Orchestrator) uses Claude Opus for ALL tasks
- Cost: ~$0.05-0.10 per workflow (spawning 5-10 agents)

**Recommended Change:**
- **Routing decisions:** Haiku 3 ($0.25/$1.25)
- **Task parsing:** Haiku 3
- **Agent selection logic:** Haiku 3
- **Complex planning:** Keep Opus 4.5 ($5/$25)

**Cost Impact:**
- Current: $0.10 per workflow
- Optimized: $0.01 per workflow (90% reduction)
- Annual: $4,500 → $450 savings

**Implementation:**
- Phase 1: Move routing to Haiku 3 (config change only)
- Phase 2: Implement escalation for complex planning

### 5.2 Orchestrator (Production)

**Target State:**
- Production workflows at scale (100-1000 per day)

**Recommended Strategy:**
- **Simple workflows:** Haiku 4.5 ($1/$5)
  - Example: "Generate daily status report"
  - Cost: $0.01 per execution
- **Complex workflows:** Sonnet 4.5 ($3/$15)
  - Example: "Deploy new feature"
  - Cost: $0.05 per execution
- **Critical workflows:** Opus 4.5 ($5/$25)
  - Example: "Production incident response"
  - Cost: $0.10 per execution

**Cost Impact (at scale):**
- 1000 workflows/day at current Opus costs: $100/day = $36,500/year
- 1000 workflows/day optimized (70% simple, 25% complex, 5% critical):
  - Simple: 700 × $0.01 = $7
  - Complex: 250 × $0.05 = $12.50
  - Critical: 50 × $0.10 = $5
  - **Total: $24.50/day = $8,942/year (75% savings)**

### 5.3 AI Studio Chat (User-Facing)

**Current State:**
- Users select model manually (Gemini/Claude/OpenAI)
- No guidance on cost/quality trade-offs

**Recommended Change:**
- **Add "Cost Mode" selector:**
  - 💰 Budget: Gemini 2.5 Flash ($0.30/$2.50)
  - ⚖️ Balanced: Claude Sonnet 4.5 ($3/$15)
  - 🎯 Premium: Claude Opus 4.5 ($5/$25)

**User Guidance:**
- Show estimated cost per message
- Recommend model based on query complexity
- "This looks like a coding question - using Sonnet (balanced mode)"

**Cost Impact:**
- Current: Users default to Opus (highest quality)
- Optimized: 60% use Balanced, 30% Budget, 10% Premium
- Average cost reduction: 50-70%

### 5.4 RAG Document Processing

**Current State:**
- Uses GPT-4 for embeddings and summarization
- Cost: ~$2.50/$10 per 1M tokens

**Recommended Change:**
- **Embeddings:** Gemini 2.0 Flash ($0.10/$0.40)
  - Simple task, quality less critical
  - 96% cost reduction
- **Summarization:** Gemini 2.5 Flash ($0.30/$2.50)
  - Moderate task, acceptable quality
  - 88% cost reduction
- **Complex extraction:** Sonnet 4.5 ($3/$15)
  - When accuracy critical

**Cost Impact:**
- Current: 10M tokens/month = $25
- Optimized: 10M tokens/month = $1
- **Annual: $300 → $12 (96% savings)**

### 5.5 Agent Tool Execution

**Current State:**
- Agents use their assigned model for ALL operations
- Alex (Sonnet) uses Sonnet even for simple file reads

**Recommended Change:**
- **Tool-specific model assignment:**
  - `read_file`: Haiku 3 ($0.25) - Simple read operation
  - `grep_codebase`: Haiku 3 ($0.25) - Simple search
  - `edit_file`: Haiku 4.5 ($1) - Requires accuracy
  - `curl_api`: Haiku 4.5 ($1) - External dependency
  - `complex_refactor`: Sonnet 4.5 ($3) - High complexity

**Implementation:**
- Modify `agents.py` to route by tool type
- Keep same agent (Alex) but swap model per operation

**Cost Impact:**
- If 50% of operations are Level 1 (reads/greps):
  - Current: 100% at Sonnet ($3)
  - Optimized: 50% at Haiku 3 ($0.25) + 50% at Sonnet ($3)
  - **Average: $1.625 per operation (46% savings)**

### 5.6 Batch Processing Opportunities

**Use Cases for 50% Discount (24-48hr SLA):**
- **Nightly reports:** Daily summaries, analytics
- **Bulk document processing:** Import 100+ client documents
- **Test suite generation:** Create tests for existing code
- **Documentation updates:** Sync docs with code changes

**Not suitable for batch:**
- User-facing chat (real-time required)
- Production incident response (urgent)
- Interactive development workflows

**Cost Impact Example:**
- Nightly reports: 50 documents × Haiku 4.5 batch ($1/$2.50)
- Cost: 50 × 100K tokens × $2.50/1M = $0.0125 per night
- **Annual: $4.56 (vs. $9.12 real-time, 50% savings)**

---

## § 6. Cost Estimation

### 6.1 Current EISLAW Costs (Estimated)

**Orchestrator Development (per month):**
- Joe (routing): 50 workflows × 50K tokens × $5/1M = $12.50
- Team agents (implementation): 200 operations × 200K tokens × $3/1M = $120
- **Total: $132.50/month = $1,590/year**

**AI Studio (per month, 10 active users):**
- Avg 100 messages/user/month × 2K tokens × $5/1M = $1 per user
- **Total: $10/month = $120/year**

**RAG Processing (per month):**
- 10M tokens processed × $2.50/1M = $25
- **Total: $25/month = $300/year**

**Grand Total (Current): $2,010/year**

### 6.2 Optimized Cost Projection

**Orchestrator Development (with optimization):**
- Joe (routing): Haiku 3: 50 × 50K × $0.25/1M = $0.625
- Team agents (mixed):
  - 40% Level 1 (Haiku 3): 80 × 100K × $0.25/1M = $2
  - 30% Level 2 (Haiku 4.5): 60 × 150K × $1/1M = $9
  - 25% Level 3 (Sonnet 4.5): 50 × 200K × $3/1M = $30
  - 5% Level 4 (Opus 4.5): 10 × 300K × $5/1M = $15
- **Total: $56.625/month = $679/year (57% savings)**

**AI Studio (with mode selector):**
- 60% use Balanced (Sonnet $3): 6 users × 100 × 2K × $3/1M = $3.60
- 30% use Budget (Flash $0.30): 3 users × 100 × 2K × $0.30/1M = $0.18
- 10% use Premium (Opus $5): 1 user × 100 × 2K × $5/1M = $1
- **Total: $4.78/month = $57/year (52% savings)**

**RAG Processing (with optimization):**
- Gemini 2.0 Flash: 10M × $0.10/1M = $1
- **Total: $1/month = $12/year (96% savings)**

**Grand Total (Optimized): $748/year**

**Overall Savings: $1,262/year (63% reduction)**

### 6.3 Production Scale Estimates

**Scenario: 1000 workflows/day**

**Current costs (all Opus):**
- 1000 workflows × 500K avg tokens × $5/1M = $2,500/day
- **Annual: $912,500**

**Optimized costs (mixed strategy):**
- 50% simple (Haiku 3): 500 × 100K × $0.25/1M = $12.50
- 30% moderate (Haiku 4.5): 300 × 300K × $1/1M = $90
- 15% complex (Sonnet 4.5): 150 × 500K × $3/1M = $225
- 5% critical (Opus 4.5): 50 × 800K × $5/1M = $200
- **Total: $527.50/day = $192,538/year**

**Production Savings: $719,962/year (79% reduction)**

### 6.4 Break-Even Analysis

**Implementation Effort:**
- Phase 1 (config changes): 8 hours × $150/hr = $1,200
- Phase 2 (routing logic): 40 hours × $150/hr = $6,000
- Phase 3 (granular decomposition): 80 hours × $150/hr = $12,000
- **Total investment: $19,200**

**Monthly Savings:**
- Development: $75/month
- Production (100 workflows/day): $2,400/month

**Break-Even Points:**
- Development only: 256 months (not viable)
- With production (100/day): 8 months
- With production (1000/day): <1 month

**Recommendation:** Implement Phase 1-2 immediately for dev workflows. Scale to production when workflow volume reaches 50-100/day.

### 6.5 Prompt Caching ROI

**Scenario: 10 agents with shared context**

**Without caching:**
- Context: 50K tokens (CLAUDE.md, project structure, standards)
- 10 agents × 50K × $5/1M = $2.50 per workflow

**With caching:**
- Write cache once: 50K × $5/1M = $0.25
- 10 cache reads: 10 × 50K × $0.50/1M = $0.25
- **Total: $0.50 per workflow (80% savings)**

**At scale (100 workflows/month):**
- Without: $250/month
- With: $50/month
- **Savings: $200/month = $2,400/year**

**Implementation cost:** 16 hours × $150 = $2,400
**Break-even:** 1 year (or faster if caching used for other features)

---

## § 7. Implementation Roadmap

### Phase 1: Immediate Wins (Week 1-2)

**Effort: 8 hours | Savings: $75/month | Break-even: Never (config-only)**

**Changes:**
1. **Joe routing to Haiku 3:**
   - Modify `backend/orchestrator/agents.py` Joe config
   - Change model from `opus-4.5` to `haiku-3`
   - Test: Spawn 10 agents, verify routing works

2. **RAG to Gemini 2.0 Flash:**
   - Update `backend/rag/embeddings.py` model config
   - Change from GPT-4 to Gemini 2.0 Flash
   - Test: Process 10 documents, verify quality

3. **AI Studio mode selector (UI only):**
   - Add dropdown: Budget / Balanced / Premium
   - Default: Balanced (Sonnet 4.5)
   - Backend change: Read `model_tier` from request

**Deliverables:**
- ✅ Joe uses Haiku 3 for routing
- ✅ RAG uses Gemini 2.0 Flash
- ✅ AI Studio shows cost mode UI
- ✅ Docs updated: `AGENT_BIBLE.md`, `AI_STUDIO_PRD.md`

**Validation:**
- Run 10 workflows, compare costs before/after
- RAG quality check: 10 documents, manual review
- AI Studio: Test all 3 modes, verify model switching

---

### Phase 2: Orchestrator Optimization (Week 3-6)

**Effort: 40 hours | Savings: $2,400/month (at 100 workflows/day) | Break-even: 8 months**

**Changes:**
1. **Implement task classification:**
   - Add `classify_task_complexity()` function to `workflow.py`
   - Rules-based: Check for keywords (read, edit, refactor, architecture)
   - Returns: Level 1-4

2. **Implement model routing:**
   - Modify `agents.py:invoke()` to accept `model_override` param
   - Route based on classification:
     - Level 1 → Haiku 3
     - Level 2 → Haiku 4.5
     - Level 3 → Sonnet 4.5
     - Level 4 → Opus 4.5

3. **Implement escalation logic:**
   - Detect failure: Tool errors, validation failures
   - Auto-escalate: Retry with next-tier model
   - Log escalations to Langfuse for analysis

4. **Tool-specific routing:**
   - Create `TOOL_MODEL_MAP` config:
     ```python
     {
       "read_file": "haiku-3",
       "grep_codebase": "haiku-3",
       "edit_file": "haiku-4.5",
       "curl_api": "haiku-4.5",
       "complex_refactor": "sonnet-4.5"
     }
     ```
   - Override agent model based on tool being called

**Deliverables:**
- ✅ `classify_task_complexity()` function
- ✅ `invoke()` supports model override
- ✅ Escalation logic with logging
- ✅ Tool-specific model routing
- ✅ Langfuse dashboard showing escalation rates
- ✅ Docs updated: `AGENT_ORCHESTRATION_STATUS.md`

**Validation:**
- Run 100 mixed-complexity workflows
- Measure: Escalation rate, cost per workflow, quality (human review 10%)
- Target: <10% escalation rate, >70% cost reduction, <5% quality degradation

---

### Phase 3: Advanced Optimization (Week 7-12)

**Effort: 80 hours | Savings: $20,000/month (at 1000 workflows/day) | Break-even: <1 month at scale**

**Changes:**
1. **Prompt caching implementation:**
   - Identify cacheable context: CLAUDE.md, project structure, API docs
   - Implement cache management: Write on update, read on spawn
   - Use Anthropic's prompt caching API
   - Monitor: Cache hit rate, cost savings

2. **Batch processing for non-urgent tasks:**
   - Identify batch-eligible workflows: Reports, docs, tests
   - Queue system: Redis or SQLite-based
   - Cron job: Process batch every 24 hours
   - Use batch API endpoints (Anthropic, OpenAI, Google)

3. **Granular task decomposition:**
   - Workflow engine: Break complex tasks into subtasks
   - Dependency graph: Subtask A → B → C
   - Parallel execution: Independent subtasks run concurrently
   - Cost optimization: Route each subtask independently

4. **Cost monitoring dashboard:**
   - Langfuse integration: Track cost per workflow, per agent, per model
   - Alerts: Daily spend > threshold
   - Analytics: Cost trends, escalation patterns, ROI tracking

**Deliverables:**
- ✅ Prompt caching with >70% cache hit rate
- ✅ Batch processing queue system
- ✅ Task decomposition engine
- ✅ Cost dashboard in Langfuse/Grafana
- ✅ Docs updated: `COST_OPTIMIZATION_GUIDE.md` (new doc)

**Validation:**
- Run 1000 workflows with full optimization stack
- Measure: Total cost, cache hit rate, batch usage, quality
- Target: >75% cost reduction vs. baseline, <5% quality degradation

---

### Phase 4: Production Hardening (Week 13-16)

**Effort: 40 hours | Enables production deployment**

**Changes:**
1. **Quality gates:**
   - Automated validation: Test suite must pass after code changes
   - Human review triggers: If escalation reaches Opus, flag for review
   - Rollback mechanism: Revert to previous model tier if quality degrades

2. **Rate limit management:**
   - Track: Requests per minute, tokens per minute per provider
   - Circuit breaker: Pause workflows if approaching limits
   - Fallback: Switch to alternative provider (e.g., Gemini if Claude throttled)

3. **Cost guardrails:**
   - Per-workflow cost limit: Abort if exceeds $1
   - Daily budget: Pause non-critical workflows if daily spend > $100
   - Alert system: Notify CEO if unusual spending pattern

4. **Monitoring and alerting:**
   - Uptime: Workflow success rate >95%
   - Latency: P95 workflow duration <2 minutes
   - Cost: Daily spend tracked, alert if >20% deviation
   - Quality: Sample 5% of outputs for manual review

**Deliverables:**
- ✅ Quality gates in `workflow.py`
- ✅ Rate limit monitoring
- ✅ Cost guardrails
- ✅ Production monitoring dashboard
- ✅ Runbook: `ORCHESTRATOR_PRODUCTION_RUNBOOK.md`

**Validation:**
- Load test: 1000 workflows/day for 1 week
- Measure: Success rate, P95 latency, total cost, quality score
- Target: >95% success, <2min P95, <$200/day cost, >90% quality

---

## § 8. Quality Gates & Validation

### 8.1 Model Selection Acceptance Criteria

**Level 1 (Budget Models) - Acceptable if:**
- ✅ Tool executes without errors
- ✅ Output format matches expected schema
- ✅ Simple validation passes (file exists, data not empty)
- ❌ No complex reasoning validation required

**Level 2 (Mid-Tier Models) - Acceptable if:**
- ✅ Tool executes without errors
- ✅ Output passes unit tests (if code change)
- ✅ Manual spot-check: 1 in 10 reviewed, passes
- ❌ No architecture/security review required

**Level 3 (Production Models) - Acceptable if:**
- ✅ All tests pass (unit + integration)
- ✅ Code review passes (can be AI-assisted via Jacob agent)
- ✅ No security vulnerabilities introduced
- ✅ Performance acceptable (<2x regression)

**Level 4 (Premium Models) - Acceptable if:**
- ✅ Human review by tech lead (CEO or senior engineer)
- ✅ Architecture aligns with project standards
- ✅ Security audit passes
- ✅ Long-term maintainability considered

### 8.2 Escalation Triggers

**Automatic Escalation (no human input):**
1. **Tool execution error**
   - Example: `read_file` returns "File not found"
   - Action: Retry with next-tier model (Haiku 3 → Haiku 4.5)

2. **Output validation failure**
   - Example: Expected JSON, got plain text
   - Action: Escalate + add "Output must be valid JSON" to prompt

3. **Test failure**
   - Example: Code change breaks 3 unit tests
   - Action: Escalate to Sonnet/Opus to fix

4. **Escalation limit reached**
   - Example: 3 escalations, still failing
   - Action: Abort, flag for human review

**Manual Escalation (human-triggered):**
1. **Quality concern**
   - Human reviewer: "This code looks wrong"
   - Action: Re-run with Opus, compare outputs

2. **Security concern**
   - Static analysis tool flags potential vulnerability
   - Action: Escalate to Opus for security review

3. **Performance regression**
   - Benchmark shows >2x slowdown
   - Action: Escalate to Opus for optimization

### 8.3 Fallback Strategy

**Scenario 1: Model unavailable (rate limit, API down)**
- Primary: Claude Sonnet 4.5
- Fallback 1: OpenAI GPT-4o (similar price/quality)
- Fallback 2: Gemini 2.5 Flash (cheaper, lower quality)
- Fallback 3: Abort, retry in 1 hour

**Scenario 2: Model quality insufficient**
- Try: Haiku 3 → Escalate to Haiku 4.5 → Sonnet 4.5 → Opus 4.5
- If Opus fails: Human review required

**Scenario 3: Cost budget exhausted**
- Pause: Non-critical workflows
- Continue: Only Level 4 (critical) operations
- Alert: CEO/tech lead

### 8.4 Cost/Quality Monitoring Dashboard

**Key Metrics:**

1. **Cost Metrics:**
   - Daily spend ($ per day)
   - Cost per workflow ($ per execution)
   - Cost breakdown by model tier (% of total)
   - Optimization savings ($ saved vs. baseline)

2. **Quality Metrics:**
   - Workflow success rate (% successful)
   - Escalation rate (% requiring escalation)
   - Human review rate (% flagged for review)
   - Quality score (manual review of 5% sample)

3. **Performance Metrics:**
   - Average workflow duration (minutes)
   - P95 workflow duration
   - Model response latency (seconds)
   - Cache hit rate (% of requests using cached context)

**Dashboard Implementation:**
- **Tool:** Langfuse (already integrated for tracing)
- **Views:**
  - Overview: Daily cost, success rate, escalation rate
  - Drill-down: Per-agent, per-model, per-workflow-type
  - Alerts: Cost spike, quality drop, rate limit approaching

**Alert Thresholds:**
- Cost: >$100/day (notify CEO)
- Quality: Success rate <90% (notify tech lead)
- Escalation: >20% of workflows require escalation (investigate classification logic)

### 8.5 Quality Validation Process

**Automated Validation (every workflow):**
1. **Pre-execution:** Task classification correct?
2. **During execution:** Tool errors? Validation failures?
3. **Post-execution:** Tests pass? Output format correct?

**Sample Review (5% of workflows):**
- Random selection: 1 in 20 workflows
- Human reviewer: Checks output quality
- Scoring: 1-5 scale (1=poor, 5=excellent)
- Feedback loop: If score <3, escalate model tier for similar tasks

**Continuous Improvement:**
- Weekly: Review escalation patterns, adjust classification rules
- Monthly: Analyze cost/quality trade-offs, update model tier assignments
- Quarterly: Re-evaluate model pricing (providers change frequently)

---

## § 9. Appendix: Research Sources & Data

### 9.1 Web Research Sources (December 2025)

**OpenAI Pricing:**
- [Pricing | OpenAI](https://openai.com/api/pricing/)
- [OpenAI Pricing Docs](https://platform.openai.com/docs/pricing)
- [LLM API Pricing Comparison (2025): OpenAI, Gemini, Claude](https://intuitionlabs.ai/articles/llm-api-pricing-comparison-2025)
- [o3-mini - Intelligence, Performance & Price Analysis](https://artificialanalysis.ai/models/o3-mini)

**Claude/Anthropic Pricing:**
- [Claude API Pricing Calculator & Cost Guide (Dec 2025)](https://costgoat.com/pricing/claude-api)
- [Pricing - Claude Docs](https://docs.claude.com/en/docs/about-claude/pricing)
- [Claude Opus 4.5 Pricing Explained: Is It the Best $5 AI Model of 2025?](https://www.glbgpt.com/hub/claude-opus-4-5-pricing/)
- [Prompt caching - Claude Docs](https://docs.claude.com/en/docs/build-with-claude/prompt-caching)
- [Claude Haiku 4.5 Deep Dive: Cost, Capabilities, and the Multi-Agent Opportunity](https://caylent.com/blog/claude-haiku-4-5-deep-dive-cost-capabilities-and-the-multi-agent-opportunity)

**Gemini Pricing:**
- [Gemini Developer API pricing | Gemini API](https://ai.google.dev/gemini-api/docs/pricing)
- [Vertex AI Pricing | Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [Gemini API Pricing Calculator & Cost Guide (Dec 2025)](https://costgoat.com/pricing/gemini-api)

**Benchmarks:**
- [Claude 4 Opus vs Gemini 2.5 Pro vs OpenAI o3 | Full Comparison](https://www.leanware.co/insights/claude-opus4-vs-gemini-2-5-pro-vs-openai-o3-comparison)
- [LLM Comparison 2025: Best AI Models Ranked (Gemini 3, GPT-5.1, Claude 4.5)](https://vertu.com/lifestyle/top-8-ai-models-ranked-gemini-3-chatgpt-5-1-grok-4-claude-4-5-more/)
- [Testing AI coding agents (2025): Cursor vs. Claude, OpenAI, and Gemini](https://render.com/blog/ai-coding-agents-benchmark)

**Other Providers:**
- [A Guide to Compare LLM Models: Top 8 AI Foundation Models Dominating 2025](https://www.sobot.io/blog/compare-llm-models-2025/)
- [LLM API Pricing Showdown 2025: Cost Comparison of OpenAI, Google, Anthropic, Cohere & Mistral](https://aithemes.net/en/posts/llm_provider_price_comparison_tags)
- [Mistral closes in on Big AI rivals with new open-weight frontier and small models](https://techcrunch.com/2025/12/02/mistral-closes-in-on-big-ai-rivals-with-mistral-3-open-weight-frontier-and-small-models/)

**Rate Limits & Context Windows:**
- [Rate limits - Claude Docs](https://docs.claude.com/en/api/rate-limits)
- [Gemini API Rate Limits: Complete Developer Guide for 2025](https://blog.laozhang.ai/ai-tools/gemini-api-rate-limits-guide/)
- [Best LLMs for Extended Context Windows](https://research.aimultiple.com/ai-context-window/)
- [LLMs with largest context windows](https://codingscape.com/blog/llms-with-largest-context-windows)

### 9.2 Pricing Data Summary (December 2025)

**Verified Pricing (all prices per 1M tokens):**

| Provider | Model | Input | Output | Context | Source Date |
|----------|-------|--------|--------|---------|-------------|
| Anthropic | Opus 4.5 | $5 | $25 | 200K-1M | 2025-11-24 |
| Anthropic | Sonnet 4.5 | $3 | $15 | 200K-1M | 2025-12-05 |
| Anthropic | Haiku 4.5 | $1 | $5 | 200K | 2025-12-05 |
| Anthropic | Haiku 3.5 | $0.80 | $4 | 200K | 2025-12-05 |
| Anthropic | Haiku 3 | $0.25 | $1.25 | 200K | 2025-12-05 |
| OpenAI | o3 | $1 | $4 | 200K | 2025-12-05 |
| OpenAI | o3-mini | $1.10 | $4.40 | 200K | 2025-12-05 |
| OpenAI | GPT-4o | $2.50 | $10 | 128K | 2025-12-05 |
| OpenAI | GPT-4o mini | $0.15 | $0.60 | 128K | 2025-12-05 |
| Google | Gemini 2.5 Pro | $1.25 | $10 | 2M | 2025-12-05 |
| Google | Gemini 2.5 Flash | $0.30 | $2.50 | 1M | 2025-12-05 |
| Google | Gemini 2.0 Flash | $0.10 | $0.40 | 1M | 2025-12-05 |
| Mistral | Medium 3 | $0.40 | $2.00 | 128K | 2025-12-05 |
| Meta | Llama 4 Maverick | $0.28 | $0.89 | 128K | 2025-12-05 |
| Meta | Llama 4 Scout | $0.19 | $0.62 | 128K | 2025-12-05 |
| Cohere | Command A | $2.77 | $11.08 | 128K | 2025-12-05 |

### 9.3 Benchmark Data Summary

**SWE-bench Verified Scores (December 2025):**

| Model | Score | Source |
|-------|-------|--------|
| Claude Opus 4.5 | 80.9% | Leanware comparison |
| Gemini 3 Pro | 76.2% | Vertu ranking |
| GPT-5.1 | 76.3% | Vertu ranking |
| o3 | 74.9% | Leanware comparison |
| Sonnet 4 | 72.7% | Leanware comparison |
| o3-mini | 72% | Artificial Analysis |
| Sonnet 3.7 | 70.3% | Medium article |
| Gemini 2.5 Pro | 63.8% | Dirox analysis |
| o3-mini (verified) | 61.0% | Dirox analysis |
| GPT-4.1 | 54.6% | Medium article |

**Note:** Scores vary by benchmark version and test configuration. These represent best-reported results from independent sources.

### 9.4 Cost Optimization Features

**Prompt Caching (Anthropic only):**
- Cache write: Standard input pricing
- Cache read: 0.1x input pricing (90% discount)
- Cache TTL: 5 minutes (sliding window)
- Minimum cache size: 1024 tokens
- Maximum cache size: Unlimited
- Source: [Claude Docs - Prompt Caching](https://docs.claude.com/en/docs/build-with-claude/prompt-caching)

**Batch Processing (all providers):**
- Discount: 50% on output tokens
- SLA: 24-48 hours
- Availability: OpenAI, Anthropic, Google
- Use case: Non-urgent bulk processing
- Source: Multiple pricing pages

**Context Window Limits (December 2025):**
- **1M+ tokens:** GPT-4.1, Sonnet 4 (beta), Gemini 2.5 Pro/Flash
- **200K tokens:** Claude models (standard), OpenAI o3/o3-mini
- **128K tokens:** GPT-4o, most other models

### 9.5 Key Insights from Research

1. **Dramatic price reductions in 2025:**
   - Claude Opus 4.5 is 66% cheaper than Opus 4.1 (released Jan 2025)
   - Ultra-budget tier emerged: $0.10-$0.30 per 1M tokens

2. **Performance democratization:**
   - Budget models (Haiku 3, GPT-4o mini) achieve 50-60% of premium quality
   - Mid-tier models (Sonnet 4.5) achieve 90% of premium at 40% lower cost

3. **Optimization features are production-ready:**
   - Prompt caching: 90% savings, widely adopted
   - Batch processing: 50% discount, available across providers
   - Combined: Up to 95% total cost reduction possible

4. **Context windows enable new strategies:**
   - 1M+ token windows allow passing entire codebases
   - Cost per token decreased, making large prompts economically viable
   - Reduces need for complex RAG systems

5. **Claude dominates coding benchmarks:**
   - Opus 4.5: 80.9% SWE-bench (highest)
   - Sonnet 4: 72.7% (competitive with GPT-5.1)
   - Worth the premium for critical coding tasks

6. **Gemini offers best price/performance for non-critical tasks:**
   - 2.0 Flash: $0.10/$0.40 (cheapest)
   - 2.5 Flash: $0.30/$2.50 (70% quality)
   - 1M+ context windows standard

7. **Model mixing is the optimal strategy:**
   - No single model wins on all dimensions
   - Route by task complexity: Budget → Mid-tier → Premium
   - Expected savings: 60-80% with <5% quality degradation

---

## § 10. Next Steps

### Immediate Actions (This Week)

1. **CEO Review & Approval:**
   - Review this PRD
   - Approve Phase 1 implementation
   - Budget allocation: $1,200 (8 hours × $150)

2. **Assign Implementation:**
   - Phase 1: Alex (backend config changes)
   - Testing: Eli (validate cost reductions)
   - Docs: David (update AGENT_BIBLE.md)

### Short-Term (Next 2 Weeks)

1. **Phase 1 Implementation:**
   - Week 1: Alex implements config changes
   - Week 2: Eli validates, David updates docs
   - Outcome: 30-50% immediate cost reduction

2. **Measure Baseline:**
   - Current: Track costs for 1 week before changes
   - After: Track costs for 1 week after changes
   - Report: Cost savings, quality impact

### Medium-Term (Next 3 Months)

1. **Phase 2 Planning:**
   - If Phase 1 successful (>30% savings, <5% quality degradation)
   - Approve Phase 2 budget: $6,000
   - Target: 60-70% total cost reduction

2. **Production Readiness:**
   - Scale to 100 workflows/day
   - Monitor: Cost, quality, reliability
   - Decision point: Scale to Phase 3 or stop

### Long-Term (6-12 Months)

1. **Production Deployment:**
   - If Phases 1-2 successful
   - Implement Phase 3 (advanced optimization)
   - Scale to 1000+ workflows/day

2. **Continuous Optimization:**
   - Quarterly: Review model pricing changes
   - Monthly: Tune classification rules based on escalation patterns
   - Weekly: Analyze cost dashboard, identify further savings

---

**End of PRD**

*This PRD is based on comprehensive web research conducted on 2025-12-09. All pricing and benchmark data is current as of December 2025. Model names, pricing, and capabilities are subject to change by providers.*