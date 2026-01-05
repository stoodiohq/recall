# Recall: Token Optimization Research & Enhanced Context Specification

**Date:** 2025-01-04
**Research Session:** Ultrathink deep-dive on token optimization
**Purpose:** Handoff document for Recall development

---

## Executive Summary: What We Unlocked

### The Core Problem
Recall provides historical memory/context to developers using AI coding tools. The risk: users load too much context, max out their token allocations, and blame Recall for making AI expensive.

### The Core Insight
**Loading memory isn't the job. Answering questions is the job.**

The mental model shift: Recall isn't a "memory loader" that dumps context into prompts. Recall is an **intelligent retrieval system** that knows everything but only speaks when spoken to.

### The Breakthrough: Two User Personas, Two Modes

We identified that optimizing purely for "minimal tokens" misses a critical use case:

| Persona | Need | Strategy |
|---------|------|----------|
| **Active Developer** | "What did we decide about auth?" | Minimal retrieval, fast answers |
| **New Team Member** | "How does this team work?" | Full context, browsable, learnable |

For onboarding, full context IS the value. New hires want to see:
- How the team prompts
- What worked and what failed
- The reasoning behind decisions
- The patterns that produce good results

### The Solution: Enhanced Full Context

Instead of raw transcripts (expensive AND hard to search), we enhance context at write-time with semantic structure, tags, and metadata that makes it:
- **Browsable** for onboarding
- **Searchable** via semantic retrieval
- **Cacheable** across all AI providers
- **Learnable** with explicit patterns and lessons

---

## Key Research Findings

### 1. Session Restarts Don't Save Tokens

**Common misconception:** "Starting a new session saves tokens"

**Reality:** Each API call is stateless. You pay for what you send, not when you send it. Restarting only saves tokens if you load less context afterward.

### 2. More Context Often Hurts Performance

Research shows "lost in the middle" - LLMs perform **worse** with bloated context:
- After ~10K tokens of context, retrieval accuracy drops 30%+
- Information in the middle of long contexts is often ignored
- Focused, relevant context beats comprehensive context

### 3. The Industry Has Converged

All major AI coding tools (Cursor, Copilot, Continue, Aider) use the same pattern:
1. Store everything (cheap storage)
2. Embed everything (compute once)
3. Load almost nothing (retrieve only what's relevant)
4. Cache what repeats (provider discounts)

### 4. Cross-Platform Caching Is Available

| Provider | Discount | Min Tokens | Type |
|----------|----------|------------|------|
| **Anthropic (Claude)** | 90% read | 1,024 | Manual (cache_control) |
| **OpenAI (GPT/Codex)** | 50-75% | 1,024 | Automatic |
| **Google Gemini** | 75-90% | 1,024-4,096 | Automatic (since May 2025) |
| **DeepSeek** | Supported | Varies | Manual |

**Universal rule:** Structure prompts with static content first, dynamic content last.

### 5. Compression Ratios Are Significant

| Technique | Token Savings |
|-----------|---------------|
| Tiered summarization | 50-90% |
| Semantic retrieval vs full load | 60-80% |
| Prompt caching | 50-90% per repeat |
| Format optimization (prose to structured) | 20-40% |
| Abbreviation conventions | 20-30% |

---

## Regular Full Context vs Enhanced Full Context

### Regular Full Context (What NOT to Do)

Raw transcript dump with no structure:

```
User: Can you help me fix this auth bug?
Assistant: Of course! I'd be happy to help. Could you tell me more about what's happening?
User: Users can't log in with Google
Assistant: I see. Let me look into that. The issue might be related to...
[20 more lines of exploration]
Assistant: Found it! The OAuth callback URL is misconfigured.
User: Great, how do I fix it?
Assistant: You need to update GOOGLE_CALLBACK_URL in your .env file to...
User: Thanks that worked!
Assistant: Great! Is there anything else you need help with?
User: No that's all for now
Assistant: Happy to help! Let me know if you run into any other issues.
```

**Problems with raw transcripts:**

| Issue | Impact |
|-------|--------|
| No semantic structure | Hard to search, retrieve wrong chunks |
| Pleasantries included | Wastes tokens on "Happy to help!" |
| Exploration paths included | Dead ends consume tokens |
| No decision markers | Can't find "what was decided" quickly |
| No lesson extraction | Failures aren't surfaced as learnings |
| No chunking hints | Embedding splits at arbitrary points |

**Token cost:** ~500 tokens for one simple bug fix, mostly noise.

---

### Enhanced Full Context (What TO Do)

Same session, enhanced at write-time:

```markdown
# Session: Google OAuth Bug Fix
<!-- METADATA -->
date: 2025-01-03
participants: [@ray, claude]
duration: 8 minutes
topic: auth, oauth, google, bug-fix
files_changed: [.env, .env.example]
outcome: success

---

## [DECISION] OAuth Callback URL Configuration
**What:** Updated GOOGLE_CALLBACK_URL to match Google Console redirect URI
**Why:** Mismatch between .env and Google Console caused auth failure
**Alternatives considered:** None - this was a configuration error, not a design choice

## [FAILURE] Initial OAuth Setup
**What failed:** Google OAuth login returning error
**Root cause:** Callback URL in .env didn't match redirect URI in Google Console
**Time to resolution:** 8 minutes

## [LESSON] Always Verify OAuth Redirect URIs
When setting up OAuth providers, verify redirect URIs in BOTH:
1. Your .env / environment configuration
2. The provider's developer console (Google, GitHub, etc.)
These must match exactly, including trailing slashes.

## [PROMPT_PATTERN] Debugging OAuth Issues
Effective prompt that led to quick resolution:
> "Users can't log in with Google. The OAuth flow starts but fails on callback."
This gave enough context (OAuth, callback failure) without over-specifying.

## [CODE_CHANGE] Environment Files
- `.env` - Updated GOOGLE_CALLBACK_URL value
- `.env.example` - Added comment about matching Google Console

---

<details>
<summary>Raw Transcript (487 tokens) - Click to expand</summary>

[Full original conversation preserved here for complete fidelity]

</details>
```

**Benefits of enhanced context:**

| Enhancement | Benefit |
|-------------|---------|
| Semantic tags (`[DECISION]`, `[FAILURE]`, etc.) | Chunk by meaning, retrieve precisely |
| Metadata header | Filter by date, topic, participants |
| Extracted lessons | Onboarding devs learn from failures |
| Prompt patterns | Team learns what prompts work |
| Code change tracking | Link sessions to actual changes |
| Collapsible raw | Full fidelity available when needed |

**Token cost for retrieval:** ~150 tokens for the actionable content, raw transcript only loaded on demand.

---

## Enhanced large.md Specification

### File Structure

```
/project/
  /recall/
    small.md      # ~500 tokens, always loaded
    medium.md     # ~2-5K tokens, loaded on demand
    large.md      # Enhanced full context, searchable/browsable
    /embeddings/  # Vector index for semantic search
    /raw/         # Original transcripts (archive)
```

### large.md Schema

```markdown
# Recall: Enhanced Project History
<!-- LARGE.MD HEADER -->
project: project-name
last_updated: 2025-01-04T15:30:00Z
total_sessions: 47
total_decisions: 23
total_lessons: 12
token_estimate: 45000

---

## Session Index

| Date | Topic | Participants | Outcome | Key Tags |
|------|-------|--------------|---------|----------|
| 2025-01-04 | Auth refactor | @ray, @claude | success | auth, jwt, supabase |
| 2025-01-03 | OAuth bug fix | @ray, @claude | success | auth, oauth, google |
| 2025-01-02 | Payment integration | @ray, @claude | blocked | payments, stripe |
| ... | ... | ... | ... | ... |

---

## Sessions

### SESSION_2025-01-04_auth-refactor

<!-- SESSION METADATA -->
id: SESSION_2025-01-04_auth-refactor
date: 2025-01-04
time_start: 09:15:00
time_end: 11:45:00
duration_minutes: 150
participants: [@ray, @claude]
topic: auth, jwt, supabase, refactor
files_changed:
  - src/lib/auth.ts (new)
  - src/middleware.ts (modified)
  - .env.example (modified)
outcome: success
summary: Migrated from session-based auth to JWT with Supabase

---

#### [DECISION] Token-Based Authentication
**Decision ID:** DEC_2025-01-04_001
**What:** Migrated from session cookies to JWT tokens
**Why:**
- Stateless authentication works better with edge functions
- Supabase RLS requires JWT claims
- Easier horizontal scaling
**Alternatives considered:**
- Session cookies with Redis: Rejected (added infrastructure complexity)
- Magic links only: Rejected (poor UX for frequent users)
**Confidence:** High
**Reversibility:** Medium (would require auth migration)

#### [DECISION] Token Expiry Configuration
**Decision ID:** DEC_2025-01-04_002
**What:** Access token: 24h, Refresh token: 7 days
**Why:**
- 24h balances security with UX (not too frequent re-auth)
- 7-day refresh allows weekly active users to stay logged in
**Alternatives considered:**
- 1h access / 30d refresh: Rejected (too aggressive rotation)
- 7d access / 30d refresh: Rejected (security concern)
**Confidence:** Medium (may need adjustment based on user feedback)
**Reversibility:** High (configuration change only)

---

#### [SUCCESS] Supabase RLS Integration
**What worked:** Row-level security policies using JWT claims
**Why it worked:** Supabase's `auth.uid()` function reads JWT automatically
**Reusable pattern:**
```sql
CREATE POLICY "Users can only see own data"
ON user_data FOR SELECT
USING (auth.uid() = user_id);
```

#### [SUCCESS] Middleware Auth Check
**What worked:** Next.js middleware for route protection
**Why it worked:** Runs at edge, fast, doesn't hit origin for unauthorized
**Reusable pattern:** Check for valid session in middleware, redirect to /login if missing

---

#### [FAILURE] Initial Token Refresh Logic
**What failed:** First implementation didn't handle concurrent refresh requests
**Symptoms:** Race condition when multiple tabs refreshed simultaneously
**Root cause:** No mutex/lock on refresh operation
**Resolution:** Implemented refresh lock with sessionStorage flag
**Time lost:** ~45 minutes debugging

#### [LESSON] Token Refresh Race Conditions
When implementing token refresh in SPAs:
1. Multiple tabs can trigger refresh simultaneously
2. Only one refresh should execute; others should wait
3. Use a lock mechanism (sessionStorage flag, mutex, or queue)
4. Return the same promise to all concurrent callers

---

#### [PROMPT_PATTERN] Architecture Discussion
Effective prompt for getting architecture recommendations:
> "I need to migrate from session-based auth to JWT for Supabase.
> Constraints: Next.js App Router, edge functions, need RLS.
> What's the recommended token structure and refresh strategy?"

This worked well because it specified:
- Current state (session-based)
- Target state (JWT)
- Tech constraints (Next.js, edge, Supabase)
- Specific questions (structure, refresh)

#### [PROMPT_PATTERN] Debugging Race Conditions
Effective prompt when debugging the refresh issue:
> "I'm seeing inconsistent behavior with token refresh.
> Sometimes it works, sometimes I get 401s immediately after refresh.
> Multiple browser tabs are open. Could this be a race condition?"

Hypothesis-driven prompts (suggesting "race condition?") got faster diagnosis.

---

#### [CODE_CHANGE] Files Modified

**src/lib/auth.ts** (NEW FILE)
- Session management utilities
- Token refresh with race condition handling
- Supabase client initialization with auth
- Lines: 142

**src/middleware.ts** (MODIFIED)
- Added auth check for protected routes
- Redirect logic for unauthenticated users
- Lines changed: +45, -0

**.env.example** (MODIFIED)
- Added SUPABASE_URL, SUPABASE_ANON_KEY
- Added comments about required setup
- Lines changed: +8, -0

---

<details>
<summary>Raw Transcript (4,832 tokens) - Click to expand for full conversation</summary>

[TIMESTAMP: 2025-01-04T09:15:00Z]
User: I need to refactor our auth system. Currently using session cookies but...

[Full transcript preserved here]

</details>

---

### SESSION_2025-01-03_oauth-bugfix
[Next session follows same structure...]

---

## Aggregated Views

### All Decisions
[Auto-generated list of all [DECISION] blocks across sessions]

### All Lessons Learned
[Auto-generated list of all [LESSON] blocks across sessions]

### All Failures
[Auto-generated list of all [FAILURE] blocks for learning]

### Prompt Pattern Library
[Auto-generated list of all [PROMPT_PATTERN] blocks]

### File Change History
[Auto-generated timeline of all [CODE_CHANGE] blocks]
```

---

## Tag Taxonomy

### Required Tags (Must Extract)

| Tag | Purpose | Extraction Trigger |
|-----|---------|-------------------|
| `[DECISION]` | Architectural/design choices | "decided to", "went with", "chose" |
| `[FAILURE]` | What didn't work | "didn't work", "failed", "error", "bug" |
| `[LESSON]` | Learnings from failures | "learned that", "next time", "realized" |
| `[SUCCESS]` | What worked well | "worked", "solved", "fixed" |
| `[PROMPT_PATTERN]` | Effective prompts | Prompts that got good results |
| `[CODE_CHANGE]` | Files modified | Tool use: Edit, Write, file paths |

### Optional Tags (Nice to Have)

| Tag | Purpose |
|-----|---------|
| `[QUESTION]` | Open questions not yet resolved |
| `[TODO]` | Action items identified |
| `[REFERENCE]` | External docs/links cited |
| `[BLOCKER]` | Issues preventing progress |
| `[WORKAROUND]` | Temporary fixes applied |

---

## Enhancement Pipeline

When a session ends, Recall processes the raw transcript through this pipeline:

```
┌─────────────────────────────────────────────────────────────┐
│                    RAW TRANSCRIPT INPUT                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 1: Metadata Extraction                                │
│  ─────────────────────────────                               │
│  Extract: date, participants, duration, files_changed        │
│  Detect: topic keywords, outcome (success/failure/blocked)   │
│  Output: Session header block                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 2: Decision Extraction                                │
│  ────────────────────────────                                │
│  Pattern match: "decided", "went with", "chose", "using"     │
│  For each decision, extract:                                 │
│    - What was decided                                        │
│    - Why (rationale)                                         │
│    - Alternatives considered                                 │
│    - Confidence level                                        │
│  Output: [DECISION] blocks                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 3: Failure/Lesson Extraction                          │
│  ──────────────────────────────────                          │
│  Pattern match: "didn't work", "error", "bug", "failed"      │
│  For each failure, extract:                                  │
│    - What failed                                             │
│    - Root cause (if identified)                              │
│    - Resolution (if resolved)                                │
│    - Time lost                                               │
│  Generate: [LESSON] from each [FAILURE]                      │
│  Output: [FAILURE] and [LESSON] blocks                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 4: Success Pattern Extraction                         │
│  ───────────────────────────────────                         │
│  Pattern match: "worked", "solved", "that fixed it"          │
│  For each success, extract:                                  │
│    - What worked                                             │
│    - Why it worked                                           │
│    - Reusable pattern (if applicable)                        │
│  Output: [SUCCESS] blocks                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 5: Prompt Pattern Detection                           │
│  ─────────────────────────────────                           │
│  Identify: User prompts that led to good AI responses        │
│  Criteria:                                                   │
│    - Prompt followed by successful action                    │
│    - User expressed satisfaction                             │
│    - Led to [DECISION] or [SUCCESS]                          │
│  For each pattern, extract:                                  │
│    - The prompt text                                         │
│    - Why it was effective                                    │
│  Output: [PROMPT_PATTERN] blocks                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 6: Code Change Mapping                                │
│  ────────────────────────────                                │
│  Parse: Tool calls (Edit, Write, Bash git commands)          │
│  Extract:                                                    │
│    - Files created/modified/deleted                          │
│    - Summary of changes                                      │
│    - Lines changed (if available)                            │
│  Output: [CODE_CHANGE] blocks                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 7: Noise Removal                                      │
│  ──────────────────────                                      │
│  Remove from summary (keep in raw):                          │
│    - Pleasantries ("Happy to help!", "Of course!")           │
│    - Acknowledgments ("Got it", "I understand")              │
│    - Exploration dead-ends that didn't lead anywhere         │
│    - Repeated explanations of same concept                   │
│  Output: Clean enhanced sections                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 8: Chunking & Embedding                               │
│  ─────────────────────────────                               │
│  Chunk by semantic section (each [TAG] block = 1 chunk)      │
│  Generate embeddings for:                                    │
│    - Each tagged block                                       │
│    - Session summary                                         │
│    - Metadata (for filtering)                                │
│  Store in vector index                                       │
│  Output: Searchable embeddings                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 9: Aggregation Update                                 │
│  ───────────────────────────                                 │
│  Update aggregated views:                                    │
│    - Add to "All Decisions" index                            │
│    - Add to "All Lessons" index                              │
│    - Add to "Prompt Pattern Library"                         │
│    - Update file change timeline                             │
│  Output: Updated large.md aggregated sections                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   ENHANCED large.md OUTPUT                   │
│  + Vector embeddings in /embeddings/                         │
│  + Raw transcript archived in /raw/                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Retrieval Modes

### Mode 1: Retrieval Mode (Default for Active Devs)

```
User query: "How did we handle auth?"

1. Embed query
2. Search large.md embeddings for similar chunks
3. Return top-3 relevant [DECISION] and [SUCCESS] blocks
4. Total tokens loaded: ~500-1000

Response includes:
- DEC_2025-01-04_001: Token-Based Authentication
- DEC_2025-01-04_002: Token Expiry Configuration
- SUCCESS: Supabase RLS Integration
```

### Mode 2: Learning Mode (For Onboarding)

```
User: "I'm new to this project, show me auth history"

1. Load full auth-related sessions
2. Include [FAILURE] and [LESSON] blocks (learn from mistakes)
3. Include [PROMPT_PATTERN] blocks (learn how team prompts)
4. Show chronological progression
5. Total tokens loaded: ~5000-10000 (worth it for onboarding)

Response includes:
- Full SESSION_2025-01-04_auth-refactor
- Full SESSION_2025-01-03_oauth-bugfix
- All related [LESSON] blocks
- All related [PROMPT_PATTERN] blocks
```

### Mode 3: Forensic Mode (Deep Investigation)

```
User: "Show me everything about the token refresh bug"

1. Load specific session with [FAILURE] tag
2. Expand raw transcript for full context
3. Include related [LESSON] and resolution
4. Total tokens: Variable (user accepts cost)

Response includes:
- [FAILURE] Initial Token Refresh Logic (full block)
- [LESSON] Token Refresh Race Conditions
- Raw transcript section (expanded)
- Related code changes
```

---

## Caching Strategy

### What Gets Cached

| Content | Cache Duration | Invalidation |
|---------|---------------|--------------|
| small.md (project identity) | Long (hours) | Manual update |
| medium.md (summaries) | Medium (30 min) | New session added |
| Aggregated views (All Decisions, etc.) | Long (hours) | New session added |
| Individual session headers | Long (permanent) | Never (immutable) |
| Tagged blocks ([DECISION], etc.) | Long (permanent) | Never (immutable) |
| Embeddings | Long (permanent) | Content change |

### Prompt Structure for Maximum Cache Hits

```
[STATIC - CACHEABLE]
System prompt (Recall instructions)
Project context from small.md
Aggregated decision index (from large.md header)

[SEMI-STATIC - OFTEN CACHED]
Retrieved [DECISION] blocks (stable content)
Retrieved [LESSON] blocks (stable content)

[DYNAMIC - NOT CACHED]
User's current query
Session-specific retrieved chunks
```

---

## Token Budget Estimates

### By Mode

| Mode | Typical Load | Use Case |
|------|--------------|----------|
| Retrieval | 500-1500 tokens | Daily dev work |
| Learning | 5000-15000 tokens | Onboarding, deep dive |
| Forensic | Variable | Investigation |

### By Component

| Component | Token Estimate |
|-----------|---------------|
| small.md | 300-500 |
| medium.md | 2000-5000 |
| Single [DECISION] block | 100-200 |
| Single [LESSON] block | 80-150 |
| Single [PROMPT_PATTERN] block | 50-100 |
| Session header | 50-100 |
| Raw transcript (collapsed) | 0 (not loaded) |
| Raw transcript (expanded) | 500-5000+ |

---

## Implementation Priorities

### Phase 1: Core Enhancement Pipeline
1. Metadata extraction
2. [DECISION] extraction
3. [FAILURE] + [LESSON] extraction
4. Basic chunking and embedding
5. Retrieval mode implementation

### Phase 2: Learning Features
1. [PROMPT_PATTERN] detection
2. [SUCCESS] extraction
3. Learning mode with full session loading
4. Aggregated views generation

### Phase 3: Optimization
1. [CODE_CHANGE] mapping
2. Cache warming strategies
3. Token budget visibility UI
4. Forensic mode with raw transcript access

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Retrieval token usage | <1500 tokens avg | Track per query |
| Retrieval relevance | >80% useful results | User feedback |
| Enhancement accuracy | >90% correct tags | Manual review sample |
| Cache hit rate | >60% | Provider metrics |
| Onboarding time | 50% faster | Time to first PR |
| User satisfaction | No "too expensive" complaints | Support tickets |

---

## Sources & References

### Research Papers
- "Lost in the Middle: How Language Models Use Long Contexts" (Stanford, 2023)
- "MemGPT: Towards LLMs as Operating Systems" (UC Berkeley, 2023)
- "LLMLingua: Prompt Compression" (Microsoft Research, 2023)

### Provider Documentation
- Anthropic Prompt Caching: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- OpenAI Prompt Caching: https://platform.openai.com/docs/guides/prompt-caching
- Gemini Context Caching: https://ai.google.dev/gemini-api/docs/caching

### Industry Analysis
- Mem0, Letta, Zep comparison for memory architectures
- Cursor, Copilot, Continue context management patterns
- Aider prompt caching strategies

---

*Document generated from ultrathink research session. Ready for implementation.*