# Recall

**Your AI coding assistant remembers what your team has done.**

---

## The Problem

Every AI coding session starts fresh. Your AI doesn't know:
- What you did yesterday
- What your teammate tried last week
- Why the code is the way it is
- What approaches already failed
- What decisions were already made

**Result:** Developers waste hours re-explaining context. Teams re-litigate decisions. Mistakes get repeated. Knowledge lives in people's heads and dies when they switch projects.

---

## The Solution

Recall captures context from AI coding sessions and makes it available to the whole team automatically.

When a session ends, Recall:
1. Extracts what matters (decisions, failures, lessons, patterns)
2. Updates the team's shared context
3. Stores the session for learning and search
4. Pushes everything to their GitHub repo

**Next session, the AI knows everything. No commands. No files. Just work.**

---

## How It Works

### Three Files, Three Purposes

```
.recall/
  context.md         # Team brain - loads every session (~1.5-3K tokens)
  history.md         # Encyclopedia - onboarding & deep learning (~30K+ tokens)
  sessions/          # Individual records - searchable (~1.5K each)
    2024-01/
      ray/
        15-0930.md   # Jan 15, 9:30am session
      steve/
        15-1000.md
```

| File | Purpose | When Loaded |
|------|---------|-------------|
| **context.md** | Current team state | Every session (automatic) |
| **history.md** | Full encyclopedia | "Ultra remember" or onboarding |
| **sessions/** | Individual records | Search results, learning |

### What Gets Extracted

| Tag | Purpose |
|-----|---------|
| **[DECISION]** | Why we chose X over Y |
| **[FAILURE]** | What didn't work and why |
| **[LESSON]** | One actionable takeaway per failure |
| **[PROMPT_PATTERN]** | Prompts that worked well |

### The Magic

Devs just work. As they work, their AI gets smarter. They don't manage files, run commands, or change their workflow. It just happens.

---

## User Experience

### Day 1: First Session
1. Opens AI coding tool
2. Recall loads context.md automatically
3. Works normally
4. Session saves automatically
5. context.md updated

**Experience:** "I didn't have to do anything different. It just worked."

### Day 2: Second Session
1. Opens AI coding tool
2. context.md loads automatically
3. AI already knows what they did yesterday
4. No re-explaining needed

**Experience:** "Wait, it remembers what I did? Nice."

### Week 2: Teammate Joins
1. New dev says "ultra remember"
2. Gets full context.md + history.md
3. Knows all decisions, all failures, all patterns

**Experience:** "I know more about this codebase after 10 minutes than I usually do after a week."

---

## Pricing

| Plan | Monthly | Annual (17% off) | What's Included |
|------|---------|------------------|-----------------|
| **Team** | $12/seat | $10/seat | Unlimited repos, sessions, memory. We handle summarization. |
| **Enterprise** | $30/seat | $25/seat | Everything in Team + BYOK (Bring Your Own LLM Key). Code never touches our servers. |

### How BYOK Works

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

---

## Security & Trust

### What You Store (Your Repo)
```
.recall/
  context.md      (in your GitHub)
  history.md      (in your GitHub)
  sessions/       (in your GitHub)
```

### What We Store (Our Servers)
- Team ID, company name, plan info
- User ID, GitHub ID, email
- Encryption keys
- Session metadata (for stats only, not content)

### What We DON'T Store
- Session content (processed and deleted)
- Your code (never stored)
- Context/history files (in your GitHub)

**Your data is your data. You already trust GitHub. We just enable the magic.**

---

## Project Structure

```
recall/
├── cli/                 # Node.js CLI (Commander.js)
│   └── src/
│       ├── commands/    # init, auth, status, uninstall
│       └── core/        # storage, config
│
├── mcp/                 # MCP Server
│   └── src/             # recall_* tools
│
├── web/                 # Next.js 14 (App Router)
│   └── src/app/         # Pages: landing, dashboard, onboarding
│
├── cloud/               # Cloudflare Workers + Hono + D1
│   └── src/             # API routes
│
└── plan/                # Planning docs (source of truth)
    ├── recall-team-product-plan.md   # What to build
    └── recall-team-frontend-plan.md  # How it looks
```

---

## Development

### Setup

```bash
# Clone
git clone https://github.com/stoodiohq/recall.git
cd recall

# CLI
cd cli && npm install && npm run build

# MCP
cd ../mcp && npm install && npm run build

# Web
cd ../web && npm install && npm run dev  # localhost:3000

# API
cd ../cloud && npm install && wrangler dev  # localhost:8787
```

### Build Commands

```bash
# Build all
npm run build --prefix cli
npm run build --prefix mcp
npm run build --prefix web

# Run dev
npm run dev --prefix web
```

---

## User Roles

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
| Manage billing | ✓ | ✓ | ✗ |
| Delete team | ✓ | ✗ | ✗ |

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

---

## Build Phases

### Phase 1: Foundation
- Cloud infrastructure (Cloudflare Workers, D1)
- Auth system (GitHub OAuth)
- Basic API

### Phase 2: MCP
- MCP with file structure
- context.md loading
- Session saving

### Phase 3: Summarization
- Extraction prompt and pipeline
- context.md update logic

### Phase 4: Dashboard
- Repo management
- Team management
- Activity feed

### Phase 5: Launch
- Public launch
- More AI tool integrations

---

## Hotwords

Control what context gets loaded:

| Say This | What Happens |
|----------|--------------|
| *(default)* | Loads context.md (~1.5-3K tokens) |
| "remember" | Loads history.md (~30K tokens) |
| "ultraremember" | Loads full sessions/ |

---

## Why This Will Work

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

## Contact

- **Website:** https://recall.team
- **API:** https://api.recall.team
- **Email:** hello@recall.team

---

*This is the product. Build this.*
