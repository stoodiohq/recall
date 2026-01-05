# Recall - Development History

Sessions: 4 | Updated: 2026-01-04

## 2026-01-04 (Session 4): Product Definition & Architecture

### The Big Insight
**The value is in READING, not writing.** When AI starts with full repo history - what was built, what failed, why decisions were made - it never repeats mistakes and never starts from zero.

### Licensing Problem & Solution
**Problem:** If 1 dev pays and creates `.recall/`, other devs with repo access can read the files for free.

**Solution: Encrypted Summaries**
- `.recall/small.md.enc`, `medium.md.enc`, `large.md.enc` (encrypted)
- Team encryption key stored on Recall servers (never in repo)
- CLI fetches key only if user has valid seat
- No seat → sees encrypted gibberish, AI starts from zero
- Key management is invisible to users (just `recall login` once)

### UX Flow (Invisible)
```
Session START:
  → Check seat status via API
  → If valid: fetch decryption key, decrypt .recall/*.enc, load into AI
  → If no seat: "Contact admin for Recall access"

Session END:
  → Auto-capture events from AI tool
  → Send to Recall for summarization
  → Encrypt summaries with team key
  → Commit encrypted files to repo
```
Dev changes nothing about workflow. It just works.

### Pricing Locked In
| Tier | Price | Limits |
|------|-------|--------|
| Free | $0 | Solo, 1 repo, 30 days history |
| Team | $12/user/mo | Unlimited repos, 1 year history |
| Enterprise | $25-35/user/mo | BYOK, SSO, unlimited history, SLA |

ROI math: At $12/seat, needs to save **10 minutes/month** to break even. Senior dev time = $100-150/hr.

### AI Tool Support (Launch)
- Claude Code
- Cursor
- Codex
- Gemini CLI
- Anti-gravity
- VS Code + Copilot

Each tool gets an extractor module. Clean architecture for adding new tools.

### Summary Quality Standards (From Dev Team Research)
Every summary must have:
- **Frontmatter:** session_id, timestamp, outcome (success/failed/exploration), category, stack, files_touched, tags, contributors
- **Body:** TL;DR, What Happened, Key Decisions (with WHY), Files Changed, Gotchas, Open Questions
- **Failed experiments:** "Don't Repeat This" section with time wasted

### Hotwords
- Default: small.md loaded
- "remember" → medium.md
- "ultra remember" → large.md

### Settings Needed
- AI provider for summaries (default: Recall-owned)
- Default memory size (small/medium/large)
- Save triggers (session end ON, commit ON, push ON)
- Tool-specific command reference

### What We Learned From Dev Team Research
- Knowledge dies in 5 places: Slack, DMs, heads, stale docs, AI conversations
- 100% of devs use AI tools, 0% share AI conversations
- Seniors lose 40% time to repeat questions
- Onboarding: 2-4 weeks → could be days with Recall
- Recall fits naturally at: session end, PR creation, onboarding, context switching

---

## 2026-01-04 (Session 3): Production Deployment

### What Was Done
- Deployed web to Cloudflare Pages (https://recall.team)
- DNS: Moved from GoDaddy to Cloudflare nameservers
- Fixed OAuth callback URL (must hit API, not web)
- Conducted dev team workflow research
- Saved research to `/research/dev-team-workflows.md`

### Infrastructure
- Cloudflare Pages: `recall-web`
- Cloudflare Account: f2ef265e3ed726d152ec6ff27eab93a1
- API Token: 66Ckxjy-r5yk4WFivRTV7F8SYc3UxZVLocgXAen0

### OAuth Config
- Client ID: Ov23liXv71K7MIiy1iRy
- Callback: `https://recall-api.stoodiohq.workers.dev/auth/github/callback`
- NOT `https://recall.team/auth/callback` (web is static, can't handle OAuth)

---

## 2026-01-03: Dashboard & Checkout Flow

### What Was Built
- GitHub OAuth login flow with AuthContext
- Dashboard: avatar, email, subscription, team info
- Mock checkout: plan selection, team creation
- API: POST /teams, GET /teams/me

### Key Files
- `web/src/lib/auth.ts` - Token storage
- `web/src/lib/AuthContext.tsx` - React auth context
- `web/src/app/checkout/page.tsx` - Mock checkout
- `web/src/app/dashboard/page.tsx` - Dashboard
- `cloud/src/index.ts` - Team endpoints

### Decisions
- Mock billing (no Stripe yet)
- Team tiers: starter (5), team (20), business (50)

---

## 2024-12-30: Initial Build

### Architecture
- Event sourcing: events.jsonl is source of truth
- Git-native: `.recall/` folder, syncs via git
- Edge-first: Cloudflare Workers + D1

### CLI Structure
```
cli/src/
├── commands/    # init, save, status, sync
├── extractors/  # claude-code, cursor, codex, gemini
├── core/        # types, storage, snapshots
└── utils/       # git helpers
```

### Extractors
| Tool | Location | Format |
|------|----------|--------|
| Claude Code | ~/.claude/projects/[hash]/*.jsonl | JSONL |
| Cursor | ~/Library/.../workspaceStorage/[hash]/state.vscdb | SQLite |
| Codex | ~/.codex/sessions/YYYY/MM/DD/*.jsonl | JSONL |
| Gemini | ~/.gemini/tmp/[hash]/chats/*.json | JSON |

### Visual Language
- Dark: #09090B
- Accent: #22D3EE (cyan)
- Font: Geist
- Vibe: Minimal, developer-focused

---
*See large.md for complete chat transcripts*
