# Recall - Development History

Sessions: 9 | Updated: 2026-01-05

## 2026-01-05 (Sessions 7-9): Auto-Context Loading Fix + Team Features

### The Core Problem We Solved
Steven Ray installed Recall, opened Claude in a Recall-enabled project, said "summarize this project" - Recall didn't get called. Why? **MCP tools are opt-in.** Claude only calls them when it thinks they're relevant. Global ~/.claude/CLAUDE.md instructions get lost in context.

### The Solution (v0.3.2)
Two-pronged approach:
1. **Project CLAUDE.md on save/init:** When `recall_save_session` or new `recall_init` is called, create/update a CLAUDE.md in the project root with "CRITICAL: call `recall_get_context` immediately"
2. **Startup check:** On MCP server startup, if `.recall/` exists but CLAUDE.md doesn't or lacks Recall section, auto-create it

Claude reads project-level CLAUDE.md on session start. Instruction says to call Recall. Context loads.

**Steven Ray tested. It works.**

### Team Features Built
1. **Team management page** (`/dashboard/team`)
   - Invite team members by email with role (member/admin)
   - See pending invites and team members
   - Remove/delete buttons (delete fully removes user from system)

2. **Repos page permissions** (`/dashboard/repos`)
   - Shows ALL team repos, not just user's GitHub repos
   - Purple "Team" badge for repos added by others
   - "Added by [name]" for repos user can't toggle
   - Can only toggle repos you enabled

3. **Activity tracking** (memory_access_logs table)
   - Logs every read/write to memory files
   - Shows in dashboard (who accessed what when)

4. **Member deletion endpoint** (`DELETE /teams/members/:userId`)
   - `fullDelete=true` removes from users table completely
   - Clears foreign keys in team_invites, repos, api_tokens

### Files Changed
- `/mcp/src/index.ts` - createProjectClaudeMd(), checkProjectRecallSetup(), recall_init tool
- `/mcp/package.json` - v0.3.2
- `/cloud/src/index.ts` - DELETE /teams/members/:userId, repos with enabledBy info
- `/web/src/app/dashboard/team/page.tsx` - invite form, member list, remove/delete buttons
- `/web/src/app/dashboard/repos/page.tsx` - team repos, permissions

---

## 2026-01-05 (Sessions 5-6): MCP Server Launch & Dashboard Polish

### What Was Done
1. **Published MCP server to npm** as `recall-mcp-server@0.2.0`
2. **One-command install:** `npx recall-mcp-server install <token>`
3. **Migrated GitHub OAuth** from personal (raydawg88) to StoodioHQ organization
4. **Updated dashboard "Recall is Active" page**

### Decisions Made
- Install instructions must say "system terminal" not inside AI tool
- Token usage warnings: `remember` = low, `ultra remember` = high
- GitHub OAuth: "Recall by Stoodio" not "Ray Hernandez"

---

## 2026-01-04 (Session 4): Product Definition & Architecture

### The Big Insight
**The value is in READING, not writing.** When AI starts with full repo history - what was built, what failed, why decisions were made - it never repeats mistakes.

### Licensing: Encrypted Summaries
- `.recall/*.enc` files in git (encrypted, useless without key)
- Team encryption key stored on Recall servers
- Valid seat = CLI fetches key, decrypts, loads into AI

### Pricing
| Tier | Price | Limits |
|------|-------|--------|
| Free | $0 | Solo, 1 repo, 30 days |
| Team | $12/user/mo | Unlimited repos, 1 year |
| Enterprise | $25-35/user/mo | BYOK, SSO, unlimited |

---

## 2026-01-04 (Session 3): Production Deployment

- Deployed web to Cloudflare Pages (https://recall.team)
- DNS moved from GoDaddy to Cloudflare nameservers
- Fixed OAuth callback URL (API not web)

---

## 2024-12-30: Initial Build

Built complete MVP: CLI with 4 extractors, Next.js landing page, Cloudflare Workers API.

---
*See large.md for complete session transcripts*
