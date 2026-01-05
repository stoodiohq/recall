# Recall - Development History

Sessions: 6 | Updated: 2026-01-05

## 2026-01-05 (Sessions 5-6): MCP Server Launch & Dashboard Polish

### What Was Done
1. **Published MCP server to npm** as `recall-mcp-server@0.2.0`
2. **One-command install:** `npx recall-mcp-server install <token>`
3. **Migrated GitHub OAuth** from personal (raydawg88) to StoodioHQ organization
4. **Updated dashboard "Recall is Active" page:**
   - "How it works" section explaining automatic context loading
   - Magic words with token usage warnings
   - "Install on another tool" collapsible section
   - Clarified terminal instructions (system terminal, not inside AI tool)

### Decisions Made
- **Install instructions must say "system terminal"** - Users might think they run command inside Claude Code. The script runs in Terminal/iTerm and auto-configures the AI tool.
- **Token usage should be visible** - `remember` = low tokens (daily), `ultra remember` = high tokens (worth it for onboarding)
- **GitHub OAuth needs to look professional** - "Recall by Stoodio" not "Recall by Ray Hernandez"

### Issues Found
1. **Install script limitation:** Only configures first detected tool (Claude Code > Cursor > Windsurf). Users with multiple tools need `--tool` flag.
2. **Success state:** Big celebration checkmark shows on every visit. Should only show once, then simpler "active" state.

### Files Changed
- `/mcp/src/index.ts` - Install command, MCP tools
- `/mcp/package.json` - Version 0.2.0
- `/web/src/app/dashboard/page.tsx` - InstallSection, magic words, how it works
- Cloudflare secrets updated with new OAuth credentials

---

## 2026-01-04 (Session 4): Product Definition & Architecture

### The Big Insight
**The value is in READING, not writing.** When AI starts with full repo history - what was built, what failed, why decisions were made - it never repeats mistakes and never starts from zero.

### Licensing: Encrypted Summaries
- `.recall/*.enc` files in git (encrypted, useless without key)
- Team encryption key stored on Recall servers
- Valid seat = CLI fetches key, decrypts, loads into AI
- No seat = sees encrypted gibberish, AI starts from zero

### UX: Invisible/Automatic
- Session end → auto-capture, summarize, encrypt, commit
- Session start → check seat, decrypt, load context
- Hotwords: "remember" (medium), "ultra remember" (large)
- No manual commands in daily workflow

### Pricing Locked In
| Tier | Price | Limits |
|------|-------|--------|
| Free | $0 | Solo, 1 repo, 30 days |
| Team | $12/user/mo | Unlimited repos, 1 year |
| Enterprise | $25-35/user/mo | BYOK, SSO, unlimited |

---

## 2026-01-04 (Session 3): Production Deployment

- Deployed web to Cloudflare Pages (https://recall.team)
- DNS moved from GoDaddy to Cloudflare nameservers
- Fixed OAuth callback URL (API not web - web is static)
- Conducted dev team workflow research

### OAuth Config
- Client ID: Ov23liSKodelYqIumcVl (StoodioHQ)
- Callback: `https://recall-api.stoodiohq.workers.dev/auth/github/callback`

---

## 2026-01-03: Dashboard & Checkout Flow

- GitHub OAuth login with AuthContext
- Dashboard: avatar, email, subscription, team info
- Mock checkout: plan selection, team creation
- API: POST /teams, GET /teams/me

---

## 2024-12-30: Initial Build

Built complete MVP: CLI with 4 extractors, Next.js landing page, Cloudflare Workers API.

### CLI Structure
```
cli/src/
├── commands/    # init, save, status, sync
├── extractors/  # claude-code, cursor, codex, gemini
├── core/        # types, storage, snapshots
└── utils/       # git helpers
```

---
*See large.md for complete session transcripts*
