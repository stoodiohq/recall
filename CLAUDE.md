# Recall.team - AI Assistant Instructions

<!-- RECALL:START -->
## Recall Team Memory

**ON SESSION START:** Call `recall_get_context` IMMEDIATELY to load team memory.

**HOTWORD RULES - CALL EXACTLY ONE TOOL:**
- "remember" → Call `recall_get_history` ONLY (NOT recall_get_context, NOT recall_get_transcripts)
- "ultraremember" → Call `recall_get_transcripts` ONLY (NOT recall_get_history, NOT recall_get_context)

**CRITICAL:** Each hotword triggers exactly ONE recall tool. Never stack or combine them.

**ON SESSION END:** Call `recall_save_session` to save what was accomplished.
<!-- RECALL:END -->

---

## CRITICAL BUILD RULES

**FOLLOW THE PLANNING DOCS ONLY:**
- `plan/recall-team-product-plan.md` - Product Bible (What to Build)
- `plan/recall-team-frontend-plan.md` - Frontend Bible (How It Looks)

**DO NOT:**
- Make changes that deviate from the planning docs
- Assume it's okay to skip something or do something else
- Add features, files, or structures not in the planning docs
- Keep legacy code that doesn't match the planning docs

**DO:**
- Follow the planning docs exactly as written
- Follow Ray's answers to gap questions exactly
- If something in code doesn't match the plan, change the code
- If unsure, ASK - don't guess or assume

**THE PLAN IS THE TRUTH. BUILD EXACTLY WHAT IS IN THE PLAN.**

---

## What Recall Is (One Sentence)

Your AI coding assistant remembers what your team has done.

---

## The Problem We Solve

Every AI coding session starts fresh. Your AI doesn't know:
- What you did yesterday
- What your teammate tried last week
- Why the code is the way it is
- What approaches already failed
- What decisions were already made

**Result:** Wasted hours re-explaining context. Teams re-litigate decisions. Mistakes get repeated.

---

## The Solution

Recall captures context from AI coding sessions and makes it available to the whole team automatically.

When a session ends, Recall:
1. Extracts what matters (decisions, failures, lessons, patterns)
2. Updates the team's shared context
3. Stores the session for learning and search
4. Pushes everything to their GitHub repo

Next session, the AI knows everything.

---

## File Structure

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
```

### Three Files, Three Purposes

| File | Purpose | Size | When Loaded |
|------|---------|------|-------------|
| **context.md** | Current team state, what AI needs for any session | ~1.5-3K tokens | Every session |
| **history.md** | Full encyclopedia, for onboarding and deep learning | ~30K+ tokens | Onboarding, specific questions |
| **sessions/** | Individual session records, searchable, learnable | ~1.5K each | Search results, learning from teammates |

---

## Value Tags (What We Extract)

| Tag | Purpose | Quality Test |
|-----|---------|--------------|
| **[DECISION]** | Why we chose X over Y | "Would this prevent a teammate from re-litigating this choice?" |
| **[FAILURE]** | What didn't work and why | "Would reading this stop someone from trying the same failed approach?" |
| **[LESSON]** | One actionable takeaway per failure | "Could a junior apply this without asking for clarification?" |
| **[PROMPT_PATTERN]** | Prompts that worked well | "Would a junior prompt better after reading this?" |

---

## What Gets Loaded When

| Trigger | What Loads | Tokens |
|---------|------------|--------|
| Start a session | context.md | ~1.5-3K |
| "Remember" | context.md + recent sessions | ~5-10K |
| "Ultra remember" / "Onboard me" | context.md + history.md | ~30K+ |
| Specific question | context.md + search results | Variable |

**90% of sessions just load context.md.** Cheap and fast.

---

## Pricing

| Plan | Monthly | Annual (17% off) | What's Included |
|------|---------|------------------|-----------------|
| **Team** | $12/seat | $10/seat | Unlimited repos, sessions, memory. We handle summarization. |
| **Enterprise** | $30/seat | $25/seat | Everything in Team + Bring Your Own LLM Key. Code never touches our servers. |

---

## Frontend Site Map

```
recall.team/
├── / (Landing Page)
├── /pricing
├── /docs
├── /login
├── /signup
│   ├── /signup/plan (Select Plan + Seats)
│   ├── /signup/payment (Add Payment Method)
│   ├── /signup/connect (GitHub OAuth)
│   └── /signup/team (Create Team Details)
├── /join/[invite-code] (Join existing team)
├── /app (Dashboard - requires auth)
│   ├── /app/repos
│   │   └── /app/repos/[id] (Single repo view)
│   ├── /app/team
│   │   ├── /app/team/members
│   │   └── /app/team/invite
│   ├── /app/install
│   ├── /app/settings
│   │   ├── /app/settings/profile
│   │   ├── /app/settings/billing
│   │   └── /app/settings/team
│   └── /app/activity
└── /blog (Future)
```

**Note:** Plan uses `/app` for dashboard routes, current code uses `/dashboard`. These need alignment.

---

## API Endpoints

### MCP API Calls (From AI Tools)

| Call | When | Frequency |
|------|------|-----------|
| Get encryption key | Session start (if not cached) | ~Once per 30 days per user |
| Send transcript for summarization | Session end | 1 per session |

### Web App API Calls (From Dashboard)

**Auth:**
- `GET /auth/github` - Initiate GitHub OAuth
- `GET /auth/github/callback` - Handle OAuth callback
- `POST /auth/logout` - End session
- `GET /auth/me` - Get current user

**Teams:**
- `POST /teams` - Create new team
- `GET /teams/:id` - Get team details
- `PATCH /teams/:id` - Update team (name, website, industry)
- `DELETE /teams/:id` - Delete team (owner only)
- `POST /teams/:id/transfer` - Transfer ownership
- `POST /teams/join/:code` - Join team via invite code

**Members:**
- `GET /teams/:id/members` - List members with stats
- `POST /teams/:id/members` - Add member (creates invite)
- `PATCH /teams/:id/members/:userId` - Update role
- `DELETE /teams/:id/members/:userId` - Remove member
- `GET /teams/:id/invites` - List pending invites
- `DELETE /teams/:id/invites/:id` - Cancel invite
- `GET /teams/:id/invite-link` - Get/regenerate invite link

**Repos:**
- `GET /teams/:id/repos` - List enabled repos
- `GET /teams/:id/repos/available` - List available GitHub repos
- `POST /teams/:id/repos` - Enable repo (creates .recall/)
- `DELETE /teams/:id/repos/:repoId` - Disable repo
- `GET /teams/:id/repos/:repoId` - Get repo details + stats

**Activity:**
- `GET /teams/:id/activity` - Get recent activity (fetches from GitHub)
- `GET /teams/:id/repos/:repoId/sessions` - List sessions for repo
- `GET /teams/:id/repos/:repoId/context` - Get current context.md content

**Stats:**
- `GET /teams/:id/stats` - Team-wide stats
- `GET /teams/:id/members/:userId/stats` - Per-member stats

**Billing:**
- `GET /teams/:id/billing` - Get billing info
- `PATCH /teams/:id/billing/plan` - Change plan (team/enterprise)
- `PATCH /teams/:id/billing/cycle` - Change billing cycle
- `PATCH /teams/:id/billing/seats` - Add/remove seats
- `GET/POST /teams/:id/billing/payment-method` - Manage payment method
- `GET /teams/:id/billing/invoices` - List invoices

**Enterprise (BYOK):**
- `GET /teams/:id/llm-key` - Check if LLM key is configured
- `POST /teams/:id/llm-key` - Add/update LLM API key
- `DELETE /teams/:id/llm-key` - Remove LLM key
- `POST /teams/:id/llm-key/test` - Test LLM key validity

---

## User Flows

### New User (Create Team)
```
Landing → Select Plan → Add Payment → Connect GitHub → Create Team → Dashboard → Enable Repos → Install MCP → Done
```

### New User (Join Team)
```
Invite Link → Connect GitHub → Confirm Join → Dashboard → Install MCP → Done
```

### Returning User
```
Login → GitHub OAuth → Dashboard
```

### Add Repository
```
Dashboard → Repos → Enable Repo → Select → Initialize .recall/ → Install (if needed) → Done
```

---

## User Roles & Permissions

| Role | Description |
|------|-------------|
| **Owner** | Full control. One per team. |
| **Admin** | Manage team, billing, repos. |
| **Developer** | Use Recall. View team activity. |

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

## Build Phases - Backend (Product Plan)

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

## Build Phases - Frontend (Frontend Plan)

### Phase 1: Foundation
- [ ] Set up Next.js project with Tailwind + shadcn/ui
- [ ] Configure NextAuth with GitHub provider
- [ ] Build landing page (static)
- [ ] Build login/signup flow
- [ ] Build basic dashboard shell

### Phase 2: Core Flows
- [ ] Build team creation/join flow
- [ ] Build repo selection + initialization
- [ ] Build installation guide page
- [ ] Build team member management
- [ ] Connect to backend API

### Phase 3: Billing
- [ ] Integrate Stripe
- [ ] Build plan selection
- [ ] Build payment flow
- [ ] Build billing settings
- [ ] Handle trial expiration

### Phase 4: Dashboard Features
- [ ] Build repo detail views
- [ ] Build activity feed
- [ ] Build context/history viewers
- [ ] Build settings pages

### Phase 5: Polish
- [ ] Error states and edge cases
- [ ] Loading states and skeletons
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Analytics integration

---

## Frontend Page Priority

| Page | Purpose | Priority |
|------|---------|----------|
| Landing | Convert visitors | P0 |
| Pricing | Answer objections | P0 |
| Signup flow | Get users in | P0 |
| Dashboard | Central hub | P0 |
| Repo management | Core feature | P0 |
| Team management | Core feature | P0 |
| Install guide | Activation | P0 |
| Settings | Account management | P1 |
| Activity feed | Team visibility | P1 |
| Billing | Revenue | P1 |
| Docs | Self-service support | P2 |

---

## Design Principles

| Principle | What It Means |
|-----------|---------------|
| **Fast to value** | User should be working with Recall in under 5 minutes |
| **Show, don't tell** | Demo the product, don't explain it |
| **Minimal decisions** | Every screen has one primary action |
| **Trust signals** | GitHub-native, their data stays theirs |
| **Developer aesthetic** | Clean, fast, no fluff - devs hate fluff |

---

## Current Tech Stack

**CLI** (`/cli`)
- Node.js 18+, TypeScript strict
- Commander.js for commands

**MCP** (`/mcp`)
- MCP SDK
- Direct API integration
- Published to npm as `recall-mcp-server`

**Web** (`/web`)
- Next.js 14+ (App Router)
- TypeScript (strict)
- Tailwind CSS
- Framer Motion
- Deployed to Cloudflare Pages

**API** (`/cloud`)
- Cloudflare Workers + Hono
- D1 database (SQLite at edge)
- GitHub OAuth

---

## Infrastructure (CLOUDFLARE ONLY)

**WE USE CLOUDFLARE FOR EVERYTHING. NO VERCEL. NO AWS. NO OTHER PROVIDERS.**

| Component | Service | Project/Database Name |
|-----------|---------|----------------------|
| **API** | Cloudflare Workers | `recall-api` |
| **Database** | Cloudflare D1 | `recall-db` |
| **Frontend** | Cloudflare Pages | `recall-web` |
| **Domain** | Cloudflare DNS | `recall.team` |

### Deployment Commands

**API:**
```bash
cd cloud && npx wrangler deploy
```

**Database Migrations:**
```bash
cd cloud && npx wrangler d1 execute recall-db --remote --file=migrations/XXXX.sql
```

**Frontend:**
```bash
cd web && npm run build && npx wrangler pages deploy .next --project-name=recall-web
```

**MCP (npm):**
```bash
cd mcp && npm version patch && npm publish
```

### Environment Variables / Secrets

**API Secrets (set via `wrangler secret put`):**
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GEMINI_API_KEY`

**Frontend (set in wrangler.toml or Pages dashboard):**
- `NEXT_PUBLIC_API_URL` = `https://api.recall.team`

---

## What We Store (Our Servers)

**Teams Table:**
- Team ID, Company name, Company website, Industry, Plan, Billing cycle, Seat count, Stripe customer ID, Created at

**Users Table:**
- User ID, GitHub ID, Email, Display name, Created at

**Team Members Table:**
- Team ID, User ID, Role (owner/admin/developer), Joined at, Last active at, Session count

**Repos Table:**
- Repo ID, Team ID, GitHub repo (owner/name), Status (active/pending), Initialized at, Last session at

**Sessions Log Table (for stats only, not content):**
- Session ID, Team ID, User ID, Repo ID, Timestamp, Token count

**LLM Keys Table (Enterprise only):**
- Team ID, Provider, Encrypted API key, Created at

**What we DON'T store:**
- Session content (processed and deleted)
- Code (never stored)
- Context/history files (in their GitHub)

---

## The Magic UX Standard

A feature passes the invisible standard if:
- The user doesn't have to think about it
- It works without commands or configuration
- It improves their experience without announcing itself
- They'd miss it if it was gone, but don't notice when it's there

---

*This is the product. Build exactly this.*
