# Recall - Team Memory for AI Coding Assistants

Sessions: 11 | Last: 2026-01-05
Tokens: small ~500 | medium ~1.1k | large ~1.4k

## Current Status
- **MCP Server:** LIVE on npm as `recall-mcp-server@0.4.7`
- **Web:** LIVE at https://recall.team (Cloudflare Pages)
- **API:** https://recall-api.stoodiohq.workers.dev
- **Core Loop:** WORKING - Auto-import on startup, no manual intervention needed

## What's Working
1. One-command install: `npx recall-mcp-server install <token>`
2. GitHub OAuth signup/login flow
3. Dashboard with team management
4. Team invites with email + role
5. Repos page shows ALL team repos
6. Activity tracking (who read what memory files when)
7. **Auto-context loading via project CLAUDE.md**
8. **Auto-import of sessions on MCP startup** (NEW in v0.4.7)

## Recent Fixes (v0.4.x)
- **v0.4.7:** AUTO-IMPORT ON STARTUP - Sessions automatically captured without user action
- **v0.4.6:** Added `recall_import_all_sessions` tool + parent directory checking
- **v0.4.5:** Added projectPath param to recall_get_context for debugging cwd issues
- **v0.4.4:** Fixed JSONL parsing (Claude uses `type: "user"` not `"human"`)

## Magic Words
- `remember` - Load session history (medium.md ONLY)
- `ultraremember` - Full transcripts (large.md ONLY)

## Architecture
- Encrypted `.recall/` files in git (useless without key)
- Team encryption key on Recall servers
- Valid seat = CLI fetches key, decrypts, loads context
- Project CLAUDE.md ensures Claude calls Recall on session start
- `.recall/imported-sessions.json` tracks which sessions have been imported

## What's NOT Built
- Stripe payment integration (mock checkout only)

## Key Files
- `/mcp/` - MCP server (the npm package)
- `/web/` - Next.js dashboard on Cloudflare Pages
- `/cloud/` - Hono API on Cloudflare Workers

---
*medium.md = session history | large.md = full transcripts*
