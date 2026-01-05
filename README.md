# Recall

**Team memory for AI coding assistants.**

Your AI never starts from zero again.

---

## The Problem

Every AI coding session starts fresh. Your AI doesn't know:
- What was built yesterday
- Why that architecture decision was made
- What your teammate tried last week that failed
- The patterns your team follows

**Result:** Repeated context-setting. Duplicated mistakes. Lost knowledge when people leave.

## The Solution

Recall captures context from AI coding sessions, creates intelligent summaries, and stores them encrypted in your repo. When you start a new session, your AI reads the full history and **knows everything**.

- **What was built** and why
- **What was tried** and failed (so it doesn't suggest the same thing)
- **Who knows what** on the team
- **How things work** in this specific codebase

**It's git-native.** Memory lives in `.recall/` and syncs with your code. No separate tool to learn.

---

## How It Works

### The Magic (What Developers Experience)

```
You: Start a Claude Code session on the project
     ↓
Recall: [invisible] Check seat → Decrypt .recall/*.enc → Load into AI context
     ↓
AI: Already knows the project history, architecture decisions,
    what failed before, team conventions
     ↓
You: "Add user authentication"
     ↓
AI: "Based on the January decision to use session-based auth instead
    of JWT (see session 847a for the security reasoning), I'll implement..."
```

No commands. No manual context-setting. It just works.

### The Flow

**Session START:**
1. Recall checks: Does this dev have a valid seat?
2. If yes → Fetch decryption key from Recall servers
3. Decrypt `.recall/*.enc` files locally
4. Load context into AI (small.md by default)
5. AI starts with full project knowledge

**Session END:**
1. Recall auto-captures events from AI tool
2. Sends to Recall API for AI summarization
3. Receives structured summaries
4. Encrypts with team key
5. Commits to `.recall/` in repo
6. Pushes with normal git workflow

**For devs without a seat:**
- They see encrypted files (gibberish)
- AI starts from zero (current painful state)
- Message: "Team memory available. Contact your admin for a Recall seat."

---

## The Value Proposition

### For Developers
- **No more "let me explain the project"** - AI already knows
- **No more repeated mistakes** - AI knows what was tried and failed
- **Context switching is instant** - Pick up where you left off
- **Onboarding in hours, not weeks** - New devs have full history

### For Engineering Managers
- **Knowledge doesn't leave** when people do
- **Juniors work like seniors** - They have access to senior context
- **Seniors stop answering repeat questions** - AI has the answers
- **Measurable:** Onboarding time, PR cycle time, context-seeking hours

### For CTOs
- **ROI math is absurd:** At $12/seat, needs to save 10 min/month to break even
- **Low risk:** Memory stays in your repo, not our servers
- **Complement, not replace:** Works with existing AI tools (Copilot, Claude, Cursor)

---

## The Core Insight

**The value is in READING, not writing.**

Anyone can write docs. The magic is when your AI *reads* the full history at session start and works with complete context. That's what makes it never repeat mistakes and never start from zero.

---

## Pricing

| Tier | Price | What You Get |
|------|-------|--------------|
| **Free** | $0 | Solo dev, 1 repo, 30-day history |
| **Team** | $12/user/mo | Unlimited repos, 1-year history, team analytics |
| **Enterprise** | Custom | SSO, BYOK (bring your own LLM key), unlimited history, SLA |

**Annual discount:** $10/user/mo (save 17%)

### Why Per-Seat?
- Predictable costs (no usage surprises)
- Easy to expense (under $20/seat = "just buy it")
- Value scales with team size

### The Math
```
Senior dev fully loaded: $150k/year = ~$75/hour
Recall cost: $12/seat/month
Break-even: Save 10 minutes per month

Reality: Teams report 4+ hours/week saved
ROI: 2,000%+
```

---

## Encryption & Security

### Why Encryption?

If `.recall/` files were plain markdown, any dev with repo access could read them without paying. Encryption ensures:
- Only devs with valid seats can read summaries
- Git stays git (files sync normally)
- We don't store your data (just the keys)

### How It Works

```
.recall/
├── small.md.enc     # Encrypted - quick context
├── medium.md.enc    # Encrypted - recent sessions
├── large.md.enc     # Encrypted - full history
├── events.jsonl     # Raw events (source of truth)
└── .team            # Team ID reference
```

**Key management:**
- Team encryption key generated when team is created
- Key stored on Recall servers (never in repo)
- CLI fetches key when user has valid seat
- Encryption/decryption happens locally
- We never see decrypted content

**What we see:**
- Raw sessions (to summarize them)
- Summaries we generate

**What we DON'T store:**
- Unencrypted summaries
- Your code
- Long-term session data

We're a pass-through: process → summarize → encrypt → discard.

---

## Supported AI Tools

| Tool | Status | Extractor Location |
|------|--------|-------------------|
| Claude Code | ✅ Ready | `~/.claude/projects/` |
| Cursor | ✅ Ready | `~/Library/.../workspaceStorage/` |
| Codex | ✅ Ready | `~/.codex/sessions/` |
| Gemini CLI | ✅ Ready | `~/.gemini/tmp/` |
| Anti-gravity | 🔜 Coming | TBD |
| VS Code + Copilot | 🔜 Coming | TBD |

**Adding new tools is easy.** Each tool gets an extractor module that implements a simple interface. Clean architecture for expansion.

---

## Hotwords

Control what context gets loaded:

| Say This | What Happens |
|----------|--------------|
| *(default)* | Loads small.md (~500 tokens) |
| "remember" | Loads medium.md (~4k tokens) |
| "ultra remember" | Loads large.md (~32k tokens) |

Works in any AI tool. Just natural language.

---

## Summary Quality

Every summary includes:

### Frontmatter (Machine-Readable)
```yaml
---
session_id: "2026-01-04T14:32:00Z-abc123"
timestamp: "2026-01-04T14:32:00Z"
outcome: success | partial | failed | exploration
category: feature | bugfix | refactor | config | research
stack:
  languages: ["typescript"]
  frameworks: ["next.js", "hono"]
  services: ["cloudflare-workers", "d1"]
files_touched: ["src/api/auth.ts"]
tags: ["authentication", "oauth"]
contributors:
  - name: "ray"
    role: "human"
  - name: "claude-opus-4"
    role: "ai"
---
```

### Body (Human-Readable)
- **TL;DR** - One sentence outcome
- **What Happened** - 2-3 paragraphs
- **Key Decisions** - With reasoning (WHY, not just what)
- **Files Changed** - With context
- **Gotchas/Lessons** - What surprised us
- **Open Questions** - What's unresolved

### Failed Experiments (Special Format)
```yaml
outcome: "failed"
failure_type: approach | implementation | external
time_invested: 120  # minutes wasted
```

**Required sections:**
- What We Tried
- Why It Failed
- What We Learned
- **"Don't Repeat This"** - Explicit warning for future devs

---

## Architecture

### Tech Stack

**CLI** (`/cli`)
- Node.js 18+, TypeScript strict
- Extractors for each AI tool
- AES-256-GCM encryption
- Zero external dependencies for core

**Web** (`/web`)
- Next.js 14+ (App Router)
- Static export on Cloudflare Pages
- Tailwind CSS, Framer Motion
- Live at https://recall.team

**API** (`/cloud`)
- Cloudflare Workers + Hono
- D1 database (SQLite at edge)
- GitHub OAuth
- Live at https://recall-api.stoodiohq.workers.dev

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Git Repo                             │
│   .recall/small.md.enc  medium.md.enc  large.md.enc        │
│   (encrypted, syncs via git)                                │
└─────────────────────────────────────────────────────────────┘
                              ↑
                    commit encrypted files
                              │
┌─────────────────────────────────────────────────────────────┐
│                       Recall CLI                            │
│   - Extracts sessions from AI tools                         │
│   - Sends to API for summarization                          │
│   - Encrypts/decrypts locally                               │
│   - Loads context into AI                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                    auth check + key fetch
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       Recall API                            │
│   - Validates seats                                         │
│   - Returns encryption keys                                 │
│   - AI summarization                                        │
│   - Stores: team_id → key, user_id → seats                 │
│   - Does NOT store: summaries, code, sessions              │
└─────────────────────────────────────────────────────────────┘
```

---

## Current Status

### What's Working
- ✅ Website live at https://recall.team
- ✅ GitHub OAuth login
- ✅ Dashboard (account, team, subscription)
- ✅ Mock checkout flow
- ✅ CLI structure with extractors
- ✅ Local snapshot generation

### What's NOT Built Yet
- ❌ AI summarization (the core feature)
- ❌ Encryption layer
- ❌ Seat/license validation
- ❌ npm global install
- ❌ Real billing (Stripe)

### What's Next
1. Build AI summarization pipeline
2. Implement encryption/decryption
3. Add seat validation to API
4. Integrate with Claude Code hooks
5. Ship to beta users

---

## Development

### Setup

```bash
# Clone
git clone https://github.com/stoodiohq/recall.git
cd recall

# CLI
cd cli && npm install && npm run build && npm link

# Web
cd ../web && npm install && npm run dev  # localhost:3003

# API
cd ../cloud && npm install && wrangler dev  # localhost:8787
```

### Project Structure

```
recall/
├── cli/                 # Node.js CLI
│   └── src/
│       ├── commands/    # init, save, status, sync
│       ├── extractors/  # claude-code, cursor, codex, gemini
│       └── core/        # storage, snapshots, encryption
│
├── web/                 # Next.js landing + dashboard
│   └── src/app/         # Pages, components
│
├── cloud/               # Cloudflare Workers API
│   └── src/             # Hono routes, D1 queries
│
├── research/            # User research, competitive analysis
│
└── goldfish/            # Project memory (we use our own pattern)
```

---

## Competitive Landscape

| Product | What They Do | Pricing | Recall Difference |
|---------|--------------|---------|-------------------|
| Mem0 | Memory for AI apps | $19-249/mo (usage) | We're for teams using AI coding tools, not building AI apps |
| Zep | Temporal knowledge graphs | $25/mo + usage | We're simpler, git-native, per-seat |
| Letta | Stateful AI agents | $20/mo + credits | We work with existing tools, not a new platform |
| Dust | Team AI assistants | $32/user/mo | We're dev-focused, they're general business |

**Our position:** Cheaper than all of them, focused on dev teams, works with existing AI tools.

---

## Contact

- **Website:** https://recall.team
- **GitHub:** https://github.com/stoodiohq/recall
- **Email:** hello@recall.team

---

## For Steve

Hey Steve - this is where we're at. The core insight is that **the value is in reading, not writing**. When an AI starts a session and already knows the full project history, it doesn't repeat mistakes and doesn't need context explained.

The encryption piece solves the licensing problem - files live in git but only paying seats can decrypt them. Recall manages the keys invisibly.

Pricing is $12/seat/month for teams. Math works out to needing to save 10 minutes/month to break even. The research says teams save 4+ hours/week.

Next step is building the AI summarization pipeline and encryption layer. Then we ship to beta.

— Ray
