# Recall - Team Memory for AI Coding Assistants

Sessions: 6 | Last: 2026-01-05
Tokens: small ~1.5k | medium ~10k | large ~25k

## Current Status
- **MCP Server:** LIVE on npm as `recall-mcp-server@0.2.0`
- **Web:** LIVE at https://recall.team (Cloudflare Pages)
- **API:** https://recall-api.stoodiohq.workers.dev
- **GitHub OAuth:** Migrated to StoodioHQ org (was personal raydawg88)

## What's Working
1. One-command install: `npx recall-mcp-server install <token>`
2. GitHub OAuth signup/login flow
3. Dashboard with setup wizard (subscription → repos → MCP install)
4. "Recall is Active" page with magic words and tips

## Known Issues (Session 6)
**Install script only configures ONE tool** - Auto-detects Claude Code > Cursor > Windsurf, uses first found. Need `--tool` flag for users with multiple AI tools.

**Success state too celebratory** - Big checkmark shows every visit, should only show on first completion, then simpler "active" state.

## Magic Words
- `remember` - Load recent context (low tokens, daily use)
- `ultra remember` - Full project history (high tokens, onboarding/complex features)

## Architecture (Locked)
- Encrypted `.recall/` files in git (useless without key)
- Team encryption key on Recall servers
- Valid seat = CLI fetches key, decrypts, loads context
- No seat = AI starts from zero

## What's NOT Built
- Stripe payment integration (mock checkout only)
- AI summarization (manual memory files for now)
- Encryption layer (files unencrypted currently)

## Key Files
- `/mcp/` - MCP server (the npm package)
- `/web/` - Next.js dashboard on Cloudflare Pages
- `/cloud/` - Hono API on Cloudflare Workers

---
*medium.md = session history | large.md = full transcripts*
