# Recall - Team Memory for AI Coding Assistants

Sessions: 9 | Last: 2026-01-05
Tokens: small ~1.7k | medium ~4k | large ~6k

## Current Status
- **MCP Server:** LIVE on npm as `recall-mcp-server@0.3.2`
- **Web:** LIVE at https://recall.team (Cloudflare Pages)
- **API:** https://recall-api.stoodiohq.workers.dev
- **Core Loop:** WORKING - Steven Ray tested, context auto-loads

## What's Working
1. One-command install: `npx recall-mcp-server install <token>`
2. GitHub OAuth signup/login flow
3. Dashboard with team management
4. Team invites with email + role
5. Repos page shows ALL team repos (user can only toggle own)
6. Activity tracking (who read what memory files when)
7. **Auto-context loading via project CLAUDE.md** (the key fix)

## Recent Major Fix (2026-01-05)
**Problem:** User opens Claude in Recall project, says "summarize this" - Recall doesn't get called because MCP tools are opt-in.

**Solution:** Two-pronged approach:
1. On `recall_save_session` or `recall_init` → create/update project CLAUDE.md with instructions telling Claude to call `recall_get_context` immediately
2. On MCP startup, if `.recall/` exists but CLAUDE.md doesn't → auto-create it

**Result:** Steven Ray tested. It works.

## Magic Words
- `remember` - Load session history (medium.md)
- `ultraremember` - Full transcripts (large.md)

## Architecture
- Encrypted `.recall/` files in git (useless without key)
- Team encryption key on Recall servers
- Valid seat = CLI fetches key, decrypts, loads context
- Project CLAUDE.md ensures Claude calls Recall on session start

## What's NOT Built
- Stripe payment integration (mock checkout only)
- AI summarization (manual memory files for now)

## Key Files
- `/mcp/` - MCP server (the npm package)
- `/web/` - Next.js dashboard on Cloudflare Pages
- `/cloud/` - Hono API on Cloudflare Workers

---
*medium.md = session history | large.md = full transcripts*
