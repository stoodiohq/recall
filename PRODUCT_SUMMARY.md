# Recall.team - Complete Product Summary

---

## What It Is (One Sentence)

**Your AI coding assistant remembers what your team has done.**

---

## The Problem

Every AI coding session starts fresh. Your AI doesn't know:
- What you did yesterday
- What your teammate tried last week
- Why the code is the way it is
- What approaches already failed
- What decisions were already made

**Result:** Developers waste hours re-explaining context. Teams re-litigate decisions. Mistakes get repeated.

---

## The Solution

Recall captures context from AI coding sessions and makes it available to the whole team automatically.

When a session ends, Recall:
1. Extracts what matters (decisions, failures, lessons, patterns)
2. Updates the team's shared context
3. Stores the session for learning
4. Pushes everything to their GitHub repo

**Next session, the AI knows everything. No commands. No files. Just work.**

---

## What Was Built

### 1. MCP Server (`recall-mcp-server` on npm)

The core product - an MCP (Model Context Protocol) server that integrates with AI coding tools.

**Tools provided to AI:**
| Tool | What It Does |
|------|--------------|
| `recall_get_context` | Loads team memory at session start (~1.5-3K tokens) |
| `recall_get_history` | "remember" hotword - loads context + recent sessions |
| `recall_get_transcripts` | "ultraremember" hotword - loads full encyclopedia |
| `recall_save_session` | Saves session summary with extracted value |
| `recall_log_decision` | Quick capture of important decisions |
| `recall_status` | Check connection and team info |
| `recall_init` | Initialize Recall for a repo |
| `recall_auth` | Authenticate with API token |

**Value Extraction Tags:**
| Tag | Purpose |
|-----|---------|
| `[DECISION]` | Why we chose X over Y (with alternatives considered) |
| `[FAILURE]` | What didn't work and why (with time lost) |
| `[LESSON]` | Actionable takeaway from each failure |
| `[PROMPT_PATTERN]` | Prompts that worked well |

**File Structure Created in Repos:**
```
.recall/
  context.md      # Team brain (~1.5-3K tokens) - loads every session
  history.md      # Full encyclopedia (~30K tokens) - for onboarding
  sessions/       # Individual session records - searchable
    2026-01/
      ray/
        10-0930.md
```

---

### 2. Web Application (https://recall.team)

**Public Pages:**
| Page | Purpose |
|------|---------|
| `/` | Landing page with hero, problem/solution, how it works, pricing |
| `/pricing` | Detailed pricing with Team vs Enterprise comparison |
| `/docs` | Documentation and guides |
| `/login` | GitHub OAuth login for returning users |

**Signup Flow (4 steps):**
| Step | Page | What Happens |
|------|------|--------------|
| 1 | `/signup/plan` | Select Team ($12/seat) or Enterprise ($30/seat), monthly/annual, seat count |
| 2 | `/signup/payment` | Enter payment via Stripe, 14-day trial |
| 3 | `/signup/connect` | Connect GitHub account via OAuth |
| 4 | `/signup/team` | Create team (company name, website, industry) |

**Join Flow:**
| Page | Purpose |
|------|---------|
| `/join/[code]` | Accept invite link, connect GitHub, join existing team |

**Dashboard (`/app/*`):**
| Page | What It Does |
|------|--------------|
| `/app` | Main dashboard with setup wizard, repo status, quick stats |
| `/app/repos` | List of repositories, enable/disable Recall |
| `/app/repos/[id]` | Single repo detail - sessions, context, history |
| `/app/team` | Team members, roles, invite management |
| `/app/install` | MCP installation instructions for Claude Code, Cursor, Windsurf |
| `/app/activity` | Team activity feed |
| `/app/settings` | Account settings hub |
| `/app/settings/profile` | User profile (name, email, GitHub) |
| `/app/settings/billing` | Plan, seats, payment method, invoices |
| `/app/settings/team` | Team settings, transfer ownership, delete team |

---

### 3. API (https://api.recall.team)

Cloudflare Workers + Hono + D1 database.

**Auth Endpoints:**
- GitHub OAuth flow (login/signup)
- JWT token management
- API token generation for MCP

**Team Management:**
- Create/read/update/delete teams
- Transfer ownership
- Member management (invite, remove, change roles)
- Invite links with codes

**Repository Management:**
- List available GitHub repos
- Enable/disable repos for Recall
- Initialize `.recall/` structure
- View sessions and context per repo

**Billing (Stripe Integration):**
- Checkout session creation
- Customer portal for subscription management
- Webhook handling for subscription events
- Invoice listing

**Enterprise BYOK (Bring Your Own Key):**
- Add/update/delete LLM API keys
- Test key validity
- Encrypted storage

**Stats & Activity:**
- Team-wide stats (sessions, members, repos)
- Per-member stats
- Activity feed

---

### 4. CLI (`recall-cli`)

Command-line tool for manual operations.

**Commands:**
- `recall auth` - Authenticate with GitHub
- `recall init` - Initialize Recall in a repo
- `recall status` - Check connection status
- `recall save` - Manually save a session
- `recall load` - Load context manually

---

## Pricing

| Plan | Monthly | Annual (17% off) | What's Included |
|------|---------|------------------|-----------------|
| **Team** | $12/seat | $10/seat | Unlimited repos, sessions, memory. We handle summarization. |
| **Enterprise** | $30/seat | $25/seat | Everything in Team + BYOK (Bring Your Own LLM Key). Code never touches our servers. |

---

## User Roles

| Role | Permissions |
|------|-------------|
| **Owner** | Full control, transfer ownership, delete team |
| **Admin** | Manage team, billing, repos, invite users |
| **Developer** | Use Recall, view activity |

---

## How Data Flows

**Team Plan:**
```
AI Tool → Recall MCP → Recall API → Our LLM → Your GitHub
                              ↓
                     (we process, then delete)
```

**Enterprise Plan (BYOK):**
```
AI Tool → Recall MCP → Recall API → YOUR LLM API → Your GitHub
                              ↓
                     (we route, never see content)
```

---

## What We Store vs What They Store

**Our Servers (Cloudflare D1):**
- Team info (name, plan, seats)
- User info (GitHub ID, email)
- Membership (who's on what team)
- Session metadata (timestamps, token counts - not content)
- Encrypted LLM keys (Enterprise only)

**Their GitHub Repo:**
- `.recall/context.md` - Team brain
- `.recall/history.md` - Full encyclopedia
- `.recall/sessions/` - All session records

**We Don't Store:**
- Session content (processed and deleted)
- Their code (never touches our servers)
- Context/history files (in their GitHub)

---

## Infrastructure

| Component | Service |
|-----------|---------|
| API | Cloudflare Workers |
| Database | Cloudflare D1 |
| Frontend | Cloudflare Pages |
| DNS | Cloudflare |
| Payments | Stripe |
| Auth | GitHub OAuth |

---

## The Magic

Developers just work. As they work, their AI gets smarter. They don't manage files, run commands, or change their workflow. It just happens.

**Day 1:** "I didn't have to do anything different. It just worked."

**Day 2:** "Wait, it remembers what I did? Nice."

**Week 2 (new teammate):** "I know more about this codebase after 10 minutes than I usually do after a week."

---

## Live URLs

- **Website:** https://recall.team
- **API:** https://api.recall.team
- **MCP Package:** `npx recall-mcp-server@latest`

---

*Built January 2026*
