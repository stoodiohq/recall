# Recall.team - Complete Product Plan

**Version:** 4.0  
**Date:** January 9, 2026  
**Status:** Final

---

## Part 1: What Recall Is

### One Sentence

Your AI coding assistant remembers what your team has done.

### The Problem

Every AI coding session starts fresh. Your AI doesn't know:
- What you did yesterday
- What your teammate tried last week
- Why the code is the way it is
- What approaches already failed
- What decisions were already made

Developers waste hours re-explaining context. Teams re-litigate decisions. Mistakes get repeated. Knowledge lives in people's heads and dies when they switch projects.

### The Solution

Recall captures context from AI coding sessions and makes it available to the whole team automatically.

When a session ends, Recall:
1. Extracts what matters (decisions, failures, lessons, patterns)
2. Updates the team's shared context
3. Stores the session for learning and search
4. Pushes everything to their GitHub repo

Next session, the AI knows everything.

### The Magic

Devs just work. As they work, their AI gets smarter. They don't manage files, run commands, or change their workflow. It just happens.

---

## Part 2: Who This Is For

### Primary User

Software development teams (2-20 developers) who:
- Use AI coding assistants daily (Claude, Cursor, Copilot, etc.)
- Work in shared GitHub repositories
- Want their AI to have team context, not just individual context
- Value "invisible" tools that don't add workflow friction

### User Personas

**The Senior Dev (Ray)**
- Uses AI heavily, has developed effective prompting patterns
- Frustrated that juniors keep asking questions AI could answer
- Wants his debugging approaches and decisions preserved
- Values: Efficiency, teaching without meeting

**The Junior Dev (Sarah)**  
- New to the codebase, learning how things work
- Wants to see how seniors approach problems
- Afraid of making mistakes others already made
- Values: Learning, not looking stupid

**The Tech Lead (Steve)**
- Needs visibility into what the team is working on
- Wants to prevent duplicate work and wasted effort
- Cares about conventions being followed consistently
- Values: Coordination, quality, speed

### What They Get

| User | Without Recall | With Recall |
|------|----------------|-------------|
| Senior Dev | Re-explains decisions, answers same questions | AI knows the context, teaches for them |
| Junior Dev | Asks questions, makes known mistakes | AI warns them, shows how seniors work |
| Tech Lead | Slack messages to check status, surprises | AI knows status, catches conflicts early |

---

## Part 3: Core Philosophy

### Principles

| Principle | What It Means |
|-----------|---------------|
| **Magic UX** | Zero workflow changes. Signup, add repo, work. Nothing to learn. |
| **Their repo, their data** | Memory lives in GitHub, not our servers. They already trust GitHub. |
| **Sessions are truth** | Everything we know comes from real work, not guesses. |
| **Facts only** | We capture what's explicit. We never infer or assume. |
| **Cost efficient** | We only store encryption keys and metadata. They pay for storage via GitHub (free). |

### The "Invisible" Standard

A feature passes the invisible standard if:
- The user doesn't have to think about it
- It works without commands or configuration
- It improves their experience without announcing itself
- They'd miss it if it was gone, but don't notice when it's there

---

## Part 4: What We're Building

### File Structure

```
.recall/
  context.md                    # Team brain, loads every session (~1.5-3K tokens)
  history.md                    # Encyclopedia for onboarding/learning (~30K+ tokens)
  sessions/
    2024-01/
      ray/
        15-0930.md              # Jan 15, 9:30am session
        15-1400.md              # Jan 15, 2:00pm session
      steve/
        15-1000.md
    2024-02/
      ray/
        01-0900.md
```

### Three Files, Three Purposes

| File | Purpose | Size | When Loaded |
|------|---------|------|-------------|
| **context.md** | Current team state, what AI needs for any session | ~1.5-3K tokens | Every session |
| **history.md** | Full encyclopedia, for onboarding and deep learning | ~30K+ tokens | Onboarding, specific questions |
| **sessions/** | Individual session records, searchable, learnable | ~1.5K each | Search results, learning from teammates |

---

## Part 5: The Files In Detail

### context.md - The Team Brain

**What it is:** The distilled current state. Loads automatically at every session start.

**What it contains:**

```markdown
# Recall Context

## What This Project Is
Retirement savings fintech app. SEC regulated.
Node.js + Express API, PostgreSQL, Stripe, Plaid.
~50K users, primarily 65+.
Monorepo: /api, /web, /mobile

## How We Work Here
- Zod for validation
- snake_case in DB, camelCase in code
- Jest tests, 80% coverage target
- PRs need 1 approval minimum

## Don't Repeat These Mistakes
- localStorage breaks Safari private mode → use httpOnly cookies
- OAuth redirect URIs must match EXACTLY including trailing slash
- Don't touch /legacy - still used by mobile app

## Active Work
| Who | What | Status | Notes |
|-----|------|--------|-------|
| @steve | Rate limiting refactor | In progress | Blocked on Redis config |
| @sarah | Checkout error boundaries | In progress | 60% done |
| @ray | Payment webhook retry | Done | Merged, in prod |

## Needs Attention
- @steve blocked on Redis config - needs help

## Recently Completed
- Payment webhook retry (@ray) - fixed duplicate charge bug
- Auth token refresh (@ray) - fixed race condition with mutex

## Coming Up
- Mobile app v2 integration (next week)
```

**How it grows:**
- Month 1: ~500 tokens (basic project info)
- Month 6: ~1,500 tokens (conventions, patterns, warnings)
- Year 2: ~3,000 tokens (mature project with history)

This is fine. 3K tokens is nothing for modern AI. It grows with PROJECT COMPLEXITY, not session count.

**How it gets updated:**

Every session save updates the relevant sections:
- Active work changes status
- Completions move to "Recently Completed"  
- Failures add to "Don't Repeat These"
- New conventions add to "How We Work Here"

---

### history.md - The Encyclopedia

**What it is:** The full history. For onboarding, catching up, and deep learning.

**What it contains:**

```markdown
# Recall History

## Decision Log

### 2024-01-15: JWT over Sessions (@ray)
Chose JWT tokens over server sessions for auth.
**Why:** Edge function compatibility. Sessions require sticky routing.
**Alternatives considered:** Sessions with Redis (added complexity)
**Session:** sessions/2024-01/ray/15-0930.md

### 2024-01-12: Stripe over Square (@ray, @steve)
Chose Stripe for payments.
**Why:** Better documentation, team familiarity, same pricing.
**Session:** sessions/2024-01/ray/12-1400.md

## Failure Log

### Safari localStorage Bug (@sarah, 2024-01-10)
Stored auth tokens in localStorage. Broke in Safari private mode.
**Root cause:** Safari clears localStorage in private browsing.
**Solution:** Switched to httpOnly cookies.
**Time wasted:** 3 hours across team.
**Lesson:** Always test auth flows in private/incognito modes.
**Session:** sessions/2024-01/sarah/10-1100.md

### Token Refresh Race Condition (@ray, 2024-01-15)
Multiple browser tabs refreshing tokens simultaneously caused cascade failures.
**Root cause:** Each tab's queue was isolated, no cross-tab coordination.
**Solution:** BroadcastChannel API for cross-tab mutex.
**Time wasted:** 45 minutes.
**Lesson:** Cross-tab state requires IPC (BroadcastChannel, SharedWorker, localStorage events).
**Session:** sessions/2024-01/ray/15-0930.md

## Prompt Patterns

### Debugging Auth Issues (@ray)
> "I have a race condition where multiple browser tabs are trying to refresh the auth token at the same time. The first one succeeds but invalidates the others. How can I coordinate this across tabs?"

**Why it works:** Specific symptom, observable behavior, clear goal.
**When to use:** Timing issues across browser contexts.
**Session:** sessions/2024-01/ray/15-0930.md

### API Design Reviews (@steve)
> "Role-play as an API consumer who has never seen this codebase. Critique this endpoint design for usability, consistency, and potential confusion."

**Why it works:** Forces external perspective, specific critique areas.
**When to use:** Before finalizing public API contracts.
**Session:** sessions/2024-01/steve/14-0900.md

## Timeline

### January 2024
- Week 1: Payment integration started, Safari bug discovered
- Week 2: Auth system rebuilt (JWT migration)
- Week 3: Rate limiting refactor began

### February 2024
- Week 1: Mobile app v2 planning
- Week 2: Performance optimization sprint
```

**When it loads:**
- New hire: "onboard me" or "ultra remember"
- Returning from PTO: "what happened while I was out"
- Learning: "how did we solve the auth problem"
- Specific questions: Semantic search returns relevant sections

**Size:** Grows continuously. Could be 30K+ tokens after a year. That's fine - it only loads when needed.

---

### sessions/ - The Raw-ish Truth

**What they are:** Individual records of each AI coding session. The ground truth.

**What they contain:**

```markdown
# Session: January 15, 2024 - 9:30am

**Developer:** @ray
**Duration:** 45 minutes
**Status:** Complete

## Summary
Fixed auth token refresh race condition where multiple browser tabs refreshing simultaneously caused cascade failures. Implemented cross-tab coordination using BroadcastChannel API.

## What I Worked On
- Auth token refresh race condition
- Payment webhook retry logic
- Fixed CSS bug Sarah found

## Decisions Made

### [DECISION] Mutex over Queue for Token Refresh
**What:** Used mutex pattern with BroadcastChannel API for cross-tab coordination.
**Why:** Queue pattern doesn't help when problem is cross-tab, not single-tab. Each tab has isolated execution context.
**Alternatives:** 
- Request queue: Rejected because queues are per-tab, not shared.
- localStorage polling: Rejected because race conditions on read/write.
**Confidence:** High

## What Failed

### [FAILURE] Queue Pattern for Cross-Tab Coordination
**What we tried:** Implemented request queue for token refresh.
**What happened:** Tabs still made simultaneous requests. Queue was per-tab, not shared.
**Root cause:** Each browser tab has isolated JavaScript execution context.
**Time lost:** 30 minutes
**Resolution:** Switched to BroadcastChannel for cross-tab coordination.

## Lessons Learned

### [LESSON] Cross-Tab State Requires IPC
**From:** Queue Pattern failure
**Lesson:** When coordinating state across browser tabs, you need inter-process communication (BroadcastChannel, SharedWorker, or localStorage events). In-memory patterns like queues/mutexes are isolated per tab.
**When this applies:** Any time you're handling auth, polling, or state that could be triggered from multiple tabs.

## Prompt Patterns

### [PROMPT_PATTERN] Race Condition Debugging
**Prompt:** "I have a race condition where multiple browser tabs are trying to refresh the auth token at the same time. The first one succeeds but invalidates the others. How can I coordinate this across tabs?"
**Why it worked:** Specific about the symptom (multiple tabs), observable behavior (first succeeds, others fail), and goal (coordination).
**When to use:** Debugging timing issues across browser contexts.

## Where I Left Off
Auth is working. Next session: add refresh token rotation for security.
```

**What gets trimmed from raw transcripts:**

| Trim | Why |
|------|-----|
| AI thinking/reasoning blocks | Bloat, not useful for learning |
| AI's lengthy explanations | User prompts matter more |
| Repeated context re-statements | "As I mentioned earlier..." noise |
| "Let me help you with that" fluff | Zero value |
| Code that got committed | It's in git already |

**Result:** ~1.5-2K tokens per session (down from 5-8K raw)

**File naming:** `DD-HHMM.md` (e.g., `15-0930.md` = January 15, 9:30am)

**Organization:** By month, then by person. Folders created as needed.

**Why individual files:**
- Best search precision (find exactly what you need)
- No merge conflicts (each person owns their files)
- Resilient (corruption loses one session, not everything)
- Learnable (can see exactly how teammates work with AI)

---

## Part 6: The Summarization Engine

This is where the magic happens. Everything valuable in context.md, history.md, and sessions comes from this LLM extraction pipeline.

### The Pipeline

```
Session ends (trigger fires)
    │
    ▼
Raw transcript + metadata extracted
    │
    ▼
Sent to Recall API: POST /summarize/session
    │
    ▼
Single LLM call extracts all value
    │
    ▼
Returns structured JSON
    │
    ▼
Formatted as markdown files
    │
    ▼
Encrypted with team key
    │
    ├──► Creates sessions/YYYY-MM/user/DD-HHMM.md
    │
    ├──► Updates context.md (current state)
    │
    └──► Appends to history.md (permanent record)
    │
    ▼
Changes staged in git
    │
    ▼
Pushed with next code commit (or auto-pushed)
```

### The Value Tags

These are what we extract. Each represents a specific type of valuable information.

| Tag | Purpose | Quality Test |
|-----|---------|--------------|
| **[DECISION]** | Why we chose X over Y | "Would this prevent a teammate from re-litigating this choice?" |
| **[FAILURE]** | What didn't work and why | "Would reading this stop someone from trying the same failed approach?" |
| **[LESSON]** | One actionable takeaway per failure | "Could a junior apply this without asking for clarification?" |
| **[PROMPT_PATTERN]** | Prompts that worked well | "Would a junior prompt better after reading this?" |

### The Extraction Prompt

This is the prompt sent to our LLM to extract value from raw transcripts:

```
You are creating team memory from an AI coding session.

## Audience

The reader is a TEAMMATE who was NOT present. They need to:
1. Understand what happened without asking the original dev
2. Not repeat mistakes already made
3. Not contradict decisions already made
4. Know if work is complete or in progress
5. Know who to ask for more detail

Write as if updating a shared team log, not a personal journal.

## Output (JSON)

{
  "session_title": "3-6 word title",
  "summary": "2-3 sentences for quick scan",
  "detailed_summary": "Full context, 2-3 paragraphs",
  "status": "complete|in-progress|blocked",
  "next_steps": "if in-progress, what's next",
  "blocked_by": "if blocked, what's blocking",
  
  "decisions": [{
    "title": "Decision title",
    "what": "The choice that was made",
    "why": "The reasoning behind it",
    "alternatives": [{"option": "X", "rejected_because": "Y"}],
    "confidence": "high|medium|low"
  }],
  
  "failures": [{
    "title": "Failure title",
    "what_tried": "The approach taken",
    "what_happened": "Observable symptoms",
    "root_cause": "Why it failed (if identified)",
    "time_lost_minutes": 45,
    "resolution": "How it was fixed|Unresolved"
  }],
  
  "lessons": [{
    "title": "Lesson title",
    "derived_from_failure": "Which failure this comes from",
    "lesson": "Actionable guidance for the future",
    "when_applies": "Context where this lesson matters"
  }],
  
  "prompt_patterns": [{
    "title": "Pattern name",
    "prompt": "The actual prompt that worked",
    "why_effective": "What made it work",
    "when_to_use": "When to apply this pattern"
  }],
  
  "update_context_md": true|false,
  "context_section": "Which section to update",
  "context_content": "What to add"
}

## Extraction Rules

DECISIONS: 
- Must have alternatives considered
- "Used React" is NOT a decision unless other frameworks were discussed
- Must have reasoning that would prevent re-litigation

FAILURES:
- Must be something that actually didn't work
- Exploration that led nowhere is NOT a failure
- Must have observable symptoms and (ideally) root cause

LESSONS:
- Exactly ONE lesson per failure
- Must be ACTIONABLE, not observational
- Bad: "OAuth is hard"
- Good: "Verify redirect URIs match in both .env and provider console"

PROMPT_PATTERNS:
- Only prompts that led to successful outcomes
- Must be reusable by someone else
- Include the actual prompt text, not a description

CONTEXT FLAGS:
- Only flag update_context_md for: major architectural decisions, new conventions, new landmines, or failure patterns that could bite others
```

### Extraction Rules Detail

#### [DECISION] Extraction

**Triggers to look for:**
- "chose", "decided", "went with"
- "instead of", "rather than", "over"
- Comparisons between options
- Trade-off discussions

**Requirements:**
| Requirement | Why |
|-------------|-----|
| Explicit choice between options | "Used X" alone isn't a decision |
| Reasoning for the choice | Prevents re-litigation |
| Alternatives considered | Shows what was rejected and why |

**Good example:**
```json
{
  "title": "JWT Over Session Cookies",
  "what": "Migrated authentication from session cookies to JWT tokens",
  "why": "Supabase RLS requires JWT claims, edge functions work better stateless",
  "alternatives": [
    {"option": "Session cookies + Redis", "rejected_because": "Adds infrastructure complexity"},
    {"option": "Magic links only", "rejected_because": "Poor UX for frequent users"}
  ],
  "confidence": "high"
}
```

**Bad example (don't extract):**
```json
{
  "title": "Used TypeScript",
  "what": "The project uses TypeScript",
  "why": "",
  "alternatives": []
}
```
This is just a fact, not a decision.

#### [FAILURE] Extraction

**Triggers to look for:**
- "didn't work", "doesn't work", "failed"
- "error", "exception", "bug"
- "broke", "broken", "breaking"
- Debugging loops, frustration signals

**Requirements:**
| Requirement | Why |
|-------------|-----|
| Something actually didn't work | Exploration isn't failure |
| Observable symptoms | "It didn't work" needs specifics |
| Root cause (if known) | Helps future debugging |
| Time lost estimate | Quantifies cost of repetition |

**Good example:**
```json
{
  "title": "OAuth Callback Mismatch",
  "what_tried": "Google OAuth with callback URL from .env",
  "what_happened": "Auth flow started but failed silently on callback, no error in console",
  "root_cause": "Redirect URI in .env didn't match Google Console exactly - trailing slash difference",
  "time_lost_minutes": 45,
  "resolution": "Updated .env to match Google Console exactly"
}
```

**Bad example (don't extract):**
```json
{
  "title": "Code didn't work at first",
  "what_tried": "Some stuff",
  "what_happened": "Had to try a few things",
  "root_cause": "Unknown",
  "time_lost_minutes": 10,
  "resolution": "Fixed it"
}
```
Too vague to help anyone.

#### [LESSON] Extraction

**Requirements:**
| Requirement | Why |
|-------------|-----|
| Exactly ONE per failure | Forces distillation |
| Must be actionable | Not just observational |
| Must be generalizable | Applies beyond this case |
| Links to source failure | Shows provenance |

**Good example:**
```json
{
  "title": "OAuth URI Verification",
  "derived_from_failure": "OAuth Callback Mismatch",
  "lesson": "When setting up OAuth providers, verify redirect URIs in BOTH your .env AND the provider's console. They must match exactly, including trailing slashes.",
  "when_applies": "Any OAuth integration setup"
}
```

**Bad example:**
```json
{
  "title": "OAuth is tricky",
  "lesson": "Be careful with OAuth",
  "when_applies": "OAuth stuff"
}
```
Not actionable.

#### [PROMPT_PATTERN] Extraction

**Requirements:**
| Requirement | Why |
|-------------|-----|
| Led to successful outcome | Don't capture prompts that confused |
| Includes actual prompt text | Must be copyable |
| Explains why it worked | Teaches the principle |
| Reusable by others | Not context-specific |

**Good example:**
```json
{
  "title": "Race Condition Debugging",
  "prompt": "I have a race condition where multiple browser tabs are trying to refresh the auth token at the same time. The first one succeeds but invalidates the others. How can I coordinate this across tabs?",
  "why_effective": "Specific about symptom (multiple tabs), observable behavior (first succeeds, others fail), and goal (coordination)",
  "when_to_use": "Debugging timing issues across browser contexts"
}
```

### Building "What This Project Is"

The project identity section in context.md is built from **explicit facts only**.

| What's said in session | What we capture |
|------------------------|-----------------|
| "Our 65+ users are struggling with fonts" | Users are 65+ |
| "Making fonts bigger" | Working on fonts (no user age info) |
| "This is SEC regulated so we need audit logs" | SEC regulated |
| "Fixing the bug" | Something is broken (no inference about what) |

**The principle:** If a dev would have to ask "where did you get that?" don't include it.

**No inference. No assumptions. Facts only.**

---

## Part 7: What Gets Loaded When

| Trigger | What Loads | Tokens |
|---------|------------|--------|
| Start a session | context.md | ~1.5-3K |
| "Remember" | context.md + recent sessions | ~5-10K |
| "Ultra remember" / "Onboard me" | context.md + history.md | ~30K+ |
| Specific question ("how did we handle auth?") | context.md + search results | Variable |

**90% of sessions just load context.md.** Cheap and fast.

### Search (Not Load Everything)

When someone asks a specific question:

1. Search history.md and sessions/ for relevant content
2. Find the specific sections/files that match
3. Load ONLY those sections (~500-2K tokens)
4. AI answers with targeted context

**This is semantic search, not "load 50K tokens and hope."**

**Example:**

User: "How did we solve the OAuth redirect issue?"

1. Search finds mention in history.md (Failure Log section)
2. Search finds related session file: sessions/2024-01/sarah/10-1100.md
3. Load just those sections (~2-3K tokens)
4. AI answers with precise context

---

## Part 8: Session Save Triggers

| Trigger | When |
|---------|------|
| Explicit | User says "save session" |
| Session end | AI tool closes → prompt or auto-save |
| Timer | Every 30 min of active session |
| Significant moment | Decision made, failure encountered |

**The goal:** Sessions save without user thinking about it. The magic is automatic.

---

## Part 9: Consolidation (Optional)

**Default:** Never. Individual session files forever.

**User option:** Can consolidate when they want.

| Setting | What Happens |
|---------|--------------|
| Never (default) | Individual files stay individual |
| Weekly | Each week's files combine into one |
| Monthly | Each month's files combine into one |
| Quarterly | Each quarter's files combine into one |
| Manual | User triggers when they want |

**Important:** Consolidation COMBINES files. It does NOT summarize or lose detail. Everything valuable is preserved.

**Recommendation:** If consolidating, monthly or quarterly max. Never yearly - kills search precision.

### File Count Math

**No consolidation (5 devs, 1 year):**
- 1 context.md
- 1 history.md
- ~1,200 session files (organized in month/person folders)

**Monthly consolidation (5 devs, 1 year):**
- 1 context.md
- 1 history.md
- 60 session files (5 devs × 12 months)

Both are manageable. User chooses preference.

---

## Part 10: Why No Merge Conflicts

- Ray writes to `sessions/2024-01/ray/`
- Steve writes to `sessions/2024-01/steve/`
- They never touch each other's files
- Git merge just keeps both
- No conflicts possible

context.md and history.md are updated by our summarizer, not manually edited. Structured updates, conflicts rare.

---

## Part 11: Data Storage & Trust

### What They Store (Their Repo)

```
.recall/
  context.md      (encrypted)
  history.md      (encrypted)
  sessions/       (encrypted)
```

### What We Store (Our Servers)

**Teams Table:**
- Team ID
- Company name
- Company website (optional)
- Industry (optional)
- Plan (team/enterprise)
- Billing cycle (monthly/annual)
- Seat count
- Stripe customer ID
- Created at

**Users Table:**
- User ID
- GitHub ID
- Email
- Display name
- Created at

**Team Members Table:**
- Team ID
- User ID
- Role (owner/admin/developer)
- Joined at
- Last active at
- Session count (incrementing counter)

**Repos Table:**
- Repo ID
- Team ID
- GitHub repo (owner/name)
- Status (active/pending)
- Initialized at
- Last session at

**Sessions Log Table (for stats only, not content):**
- Session ID
- Team ID
- User ID
- Repo ID
- Timestamp
- Token count (for usage tracking)

**LLM Keys Table (Enterprise only):**
- Team ID
- Provider (openai/anthropic)
- Encrypted API key
- Created at

**What we DON'T store:**
- Session content (processed and deleted)
- Code (never stored)
- Context/history files (in their GitHub)

**We're not a data storage company.** Their data is their data. They already trust GitHub. We just enable the magic.

---

## Part 12: Encryption Key Handling

### The Rule

**If you're actively working, your key never fails.**

### How It Works

**30-day cache, extended on use.**

| Event | What Happens |
|-------|--------------|
| Session starts | Fetch key from API, store in memory + disk cache (30 day TTL) |
| During session | Key lives in memory, never expires |
| Any key use | Extend disk cache TTL to 30 days from now |
| Session ends | Key stays in disk cache |
| Open new session within 30 days | Use disk cache, no API call |
| Open new session after 30+ days | Fetch fresh key from API |

### Why 30 Days Is Fine

The actual security boundary is:
1. GitHub repo access (they control this)
2. Recall team membership (we control this)

If someone is removed from both, a cached key is useless - they have no files to decrypt.

---

## Part 13: API Endpoints

### MCP API Calls (From AI Tools)

| Call | When | Frequency |
|------|------|-----------|
| Get encryption key | Session start (if not cached) | ~Once per 30 days per user |
| Send transcript for summarization | Session end | 1 per session |

### Web App API Calls (From Dashboard)

**Auth:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/github` | GET | Initiate GitHub OAuth |
| `/auth/github/callback` | GET | Handle OAuth callback |
| `/auth/logout` | POST | End session |
| `/auth/me` | GET | Get current user |

**Teams:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/teams` | POST | Create new team |
| `/teams/:id` | GET | Get team details |
| `/teams/:id` | PATCH | Update team (name, website, industry) |
| `/teams/:id` | DELETE | Delete team (owner only) |
| `/teams/:id/transfer` | POST | Transfer ownership |
| `/teams/join/:code` | POST | Join team via invite code |

**Members:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/teams/:id/members` | GET | List members with stats |
| `/teams/:id/members` | POST | Add member (creates invite) |
| `/teams/:id/members/:userId` | PATCH | Update role |
| `/teams/:id/members/:userId` | DELETE | Remove member |
| `/teams/:id/invites` | GET | List pending invites |
| `/teams/:id/invites/:id` | DELETE | Cancel invite |
| `/teams/:id/invite-link` | GET | Get/regenerate invite link |

**Repos:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/teams/:id/repos` | GET | List enabled repos |
| `/teams/:id/repos/available` | GET | List available GitHub repos |
| `/teams/:id/repos` | POST | Enable repo (creates .recall/) |
| `/teams/:id/repos/:repoId` | DELETE | Disable repo |
| `/teams/:id/repos/:repoId` | GET | Get repo details + stats |

**Activity:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/teams/:id/activity` | GET | Get recent activity (fetches from GitHub) |
| `/teams/:id/repos/:repoId/sessions` | GET | List sessions for repo |
| `/teams/:id/repos/:repoId/context` | GET | Get current context.md content |

**Stats:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/teams/:id/stats` | GET | Team-wide stats |
| `/teams/:id/members/:userId/stats` | GET | Per-member stats |

**Billing:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/teams/:id/billing` | GET | Get billing info |
| `/teams/:id/billing/plan` | PATCH | Change plan (team/enterprise) |
| `/teams/:id/billing/cycle` | PATCH | Change billing cycle |
| `/teams/:id/billing/seats` | PATCH | Add/remove seats |
| `/teams/:id/billing/payment-method` | GET/POST | Manage payment method |
| `/teams/:id/billing/invoices` | GET | List invoices |

**Enterprise (BYOK):**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/teams/:id/llm-key` | GET | Check if LLM key is configured |
| `/teams/:id/llm-key` | POST | Add/update LLM API key |
| `/teams/:id/llm-key` | DELETE | Remove LLM key |
| `/teams/:id/llm-key/test` | POST | Test LLM key validity |

### Caching Strategy

| Data | Cache Duration | Why |
|------|----------------|-----|
| Encryption keys | 30 days | Active users always have access |
| Team details | 5 minutes | Rarely changes |
| Member list | 1 minute | May change during invites |
| Activity feed | No cache | Always fetch fresh from GitHub |
| Stats | 5 minutes | Doesn't need to be real-time |

**Caching reduces key fetches by 95%+.** Not a cost concern.

---

## Part 14: Token Economics

### Daily Work

- Load context.md: ~2K tokens
- 3-5 session starts/day: ~6-10K input tokens
- Very cheap

### Onboarding (Rare)

- Load context + history: ~30K tokens
- One-time event per person
- Worth it for full understanding

### Session Storage

- ~1.5K tokens per session after trimming
- 5 devs × 5 sessions/day × 20 days = ~750K tokens/month stored
- That's text in GitHub, basically free

### Summarization Cost

- One LLM call per session save
- Input: ~3-5K tokens (raw transcript)
- Output: ~500-1K tokens (structured JSON)
- Cost: ~$0.01-0.02 per session
- 5 devs × 5 sessions/day × 20 days = $10-20/month in LLM costs

---

## Part 15: GitHub Pricing Impact

**None.** We verified GitHub's pricing page.

GitHub limits are on:
- Actions minutes (we don't use)
- Packages storage (we don't use)
- Large File Storage (we don't need)

Regular repo files have soft limits we'll never hit:
- Individual files under 100MB: Fine (ours are ~8KB)
- Repos under 5GB: Fine (we'd use ~10MB/year per team)

**All tiers (including Free) have unlimited private repos.** Customers don't need to upgrade GitHub to use Recall.

---

## Part 16: User Roles & Permissions

### Roles

| Role | Description |
|------|-------------|
| **Owner** | Full control. One per team. |
| **Admin** | Manage team, billing, repos. |
| **Developer** | Use Recall. View team activity. |

### Permission Matrix

| Action | Owner | Admin | Developer |
|--------|-------|-------|-----------|
| Use Recall (read/write sessions) | ✓ | ✓ | ✓ |
| View team activity | ✓ | ✓ | ✓ |
| Invite users | ✓ | ✓ | ✗ |
| Remove users | ✓ | ✓ | ✗ |
| Change user roles | ✓ | ✓ | ✗ |
| Add/remove repos | ✓ | ✓ | ✗ |
| Manage billing | ✓ | ✓ | ✗ |
| Transfer ownership | ✓ | ✗ | ✗ |
| Delete team | ✓ | ✗ | ✗ |

---

## Part 17: Source of Truth Hierarchy

| Priority | Source | What It Is |
|----------|--------|------------|
| 1 | Sessions | What actually happened (ground truth) |
| 2 | Context.md | Distilled from sessions (our product) |
| 3 | History.md | Accumulated from sessions (the archive) |
| 4 | README | Optional bonus (can't rely on it) |

Sessions feed everything. We never depend on README existing or being accurate.

---

## Part 18: Quality Metrics

| Metric | Target | How We Measure |
|--------|--------|----------------|
| Decision extraction accuracy | >90% | Manual review of sample sessions |
| Failure extraction accuracy | >90% | Manual review of sample sessions |
| Retrieval relevance (top-3) | >80% | User feedback on search results |
| "What did X work on?" Slack reduction | 50% | User surveys |
| Decision re-litigation reduction | 75% | User surveys |
| Repeated failures reduction | 90% | Failure pattern analysis |

---

## Part 19: The User Journey

### Day 1: Signup

1. Dev goes to recall.team
2. Signs up with GitHub OAuth
3. Creates or joins a team
4. Adds a repo

**Time:** 2 minutes

### Day 1: First Session

1. Opens their AI coding tool
2. Recall MCP is installed (or extension, depending on tool)
3. context.md loads automatically (might be empty or seeded from README)
4. Works normally
5. Ends session
6. Prompt: "Save session?" or auto-save triggers
7. Session saved to `.recall/sessions/`
8. context.md updated

**Experience:** "I didn't have to do anything different. It just worked."

### Day 2: Second Session

1. Opens AI coding tool
2. context.md loads automatically
3. AI already knows what they did yesterday
4. No re-explaining needed

**Experience:** "Wait, it remembers what I did? Nice."

### Week 2: Teammate Joins

1. New dev joins repo
2. Says "onboard me" or "ultra remember"
3. Gets full context.md + history.md
4. Knows all decisions, all failures, all patterns
5. Can search sessions to learn how seniors work

**Experience:** "I know more about this codebase after 10 minutes than I usually do after a week."

### Month 3: Deep Question

1. Dev asks "why did we choose Stripe over Square?"
2. Semantic search finds the decision in history.md
3. Links to original session with full context
4. No need to bug the person who made the decision

**Experience:** "I got the answer without interrupting anyone. And it included the reasoning."

---

## Part 20: What Makes This Magic

| For Devs | What Happens |
|----------|--------------|
| They sign up | OAuth with GitHub |
| They add a repo | We scan and initialize context |
| They work | AI has team context automatically |
| They finish | Session saves automatically |
| Next day | AI remembers yesterday |
| Teammate joins | AI knows what everyone's done |

No commands to learn. No files to manage. No workflow changes.

**That's the product.**

---

## Part 21: Pricing

### Plans

| Plan | Monthly | Annual (17% off) | What's Included |
|------|---------|------------------|-----------------|
| **Team** | $12/seat | $10/seat | Unlimited repos, sessions, memory. We handle summarization. |
| **Enterprise** | $30/seat | $25/seat | Everything in Team + Bring Your Own LLM Key. Code never touches our servers. |

### Team Plan ($12/seat/month)

- Unlimited repos
- Unlimited sessions
- Full team memory
- Search and retrieval
- Encryption included
- We process summarization (code briefly touches our servers, then deleted)

### Enterprise Plan ($30/seat/month)

- Everything in Team, plus:
- **Bring Your Own LLM Key** - You provide your OpenAI/Anthropic API key
- **Zero code exposure** - Session data goes directly to YOUR LLM, then to YOUR GitHub
- Recall never sees your code
- For: Regulated industries, security-conscious teams, strict data policies

### How BYOK (Bring Your Own Key) Works

```
Team Plan:
  AI Tool → Recall API → Our LLM → Your GitHub
                ↓
        (we process, then delete)

Enterprise Plan:
  AI Tool → Recall API → YOUR LLM API → Your GitHub
                ↓
        (we route, never see content)
```

Enterprise customers configure their LLM API key in settings. We route the summarization request to THEIR API, receive the response, push to THEIR GitHub, done. We never see the content.

### Billing Details

| Event | What Happens |
|-------|--------------|
| Add seats mid-cycle | Prorated charge for remaining days |
| Remove seats mid-cycle | Credit applied to next invoice |
| Upgrade Team → Enterprise | Immediate, prorated |
| Downgrade Enterprise → Team | End of billing cycle |
| Annual to Monthly | End of annual term |

### Why This Pricing

- **$12 Team:** Low enough for team budget, high enough to signal value
- **$30 Enterprise:** Premium for compliance story, BYOK is worth more
- **Per-seat:** Aligns incentives (more users = more value = more revenue)

---

## Part 22: The Vision

### Short-term (Launch)

- Works with Claude Code (primary)
- MCP-based integration
- GitHub as storage
- Basic summarization

### Medium-term (6 months)

- Works with Cursor, Copilot, other tools
- Manager/CTO visibility dashboards
- "What did the team work on this week?"
- Cross-repo learning (how does our other project handle auth?)

### Long-term (12+ months)

- Acquisition target for Anthropic, GitHub, or Google
- Or: Profitable lifestyle business at $2M ARR
- Team memory becomes expected, not novel

---

## Part 23: Why This Will Work

### The Problem Is Real

Every dev who uses AI tools experiences this. "Why doesn't it remember?" is a universal frustration.

### The Solution Is Invisible

We don't ask devs to change behavior. We just make their existing workflow better.

### The Data Is Theirs

No trust issue. It's in their GitHub. We just enable the magic.

### The Price Is Right

$12/seat is nothing for a team. Less than a lunch. Obvious ROI.

### The Timing Is Right

AI coding tools are mainstream. Teams are using them daily. The memory gap is felt daily.

---

## Part 24: Build Phases

### Phase 1: Foundation
- [ ] Set up cloud infrastructure (Cloudflare Workers, D1)
- [ ] Build auth system (GitHub OAuth, team management)
- [ ] Build encryption key management
- [ ] Build basic API (summarize endpoint)

### Phase 2: MCP
- [ ] Build MCP with file structure
- [ ] Implement context.md loading
- [ ] Implement session saving
- [ ] Implement history.md appending

### Phase 3: Summarization
- [ ] Build extraction prompt and pipeline
- [ ] Build JSON-to-Markdown formatter
- [ ] Build context.md update logic
- [ ] Test with real sessions

### Phase 4: Polish
- [ ] Build search for history/sessions
- [ ] Build dashboard (teams, repos, billing)
- [ ] Build onboarding flow
- [ ] Beta testing with real teams

### Phase 5: Launch
- [ ] Public launch
- [ ] Iterate based on feedback
- [ ] Add more AI tool integrations

---

## Summary

| Question | Answer |
|----------|--------|
| What is Recall? | Team memory for AI coding assistants |
| Who is it for? | Dev teams (2-20) using AI daily |
| What problem does it solve? | AI sessions start fresh, no team context |
| How does it work? | Extracts value from sessions, stores in GitHub |
| What's the magic? | Zero workflow change, just works |
| What do we store? | Just keys and metadata |
| What do they store? | Encrypted files in their GitHub |
| How much? | $12/seat/month |
| Why will it work? | Real problem, invisible solution, right timing |

---

*This is the product. Build this.*
