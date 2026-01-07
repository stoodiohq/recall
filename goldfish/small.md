# Recall - Team Memory for AI Coding Assistants

Sessions: 12 | Last: 2026-01-06
Tokens: small ~600 | medium ~900 | large ~1.5k

## Current Status
- **MCP Server:** LIVE on npm as `recall-mcp-server@0.5.1`
- **Web:** LIVE at https://recall.team (Cloudflare Pages - Stoodio account)
- **API:** https://api.recall.team (Cloudflare Workers - Stoodio account)
- **Core Loop:** WORKING - Auto-import on startup, no manual intervention needed

## Latest Session (2026-01-06) - MAJOR MIGRATION
**Migrated ALL infrastructure from Ray's personal Cloudflare to Stoodio business account:**
- D1 Database: `recall-db` (ID: 59978e9e-eceb-4ab4-853e-241e8853fdd3)
- Worker API: `recall-api` with route api.recall.team
- Pages: `recall-web` with custom domain recall.team
- DNS Zone: recall.team (nameservers: mckenzie/miguel)
- MCP Server: Updated to v0.5.1 with new API URL

**Key files changed:**
- `/cloud/wrangler.stoodio.toml` - Stoodio deployment config
- `/cloud/src/index.ts` - Updated CORS, OAuth callback, redirects
- `/web/wrangler.toml` - Pages config with nodejs_compat
- `/mcp/src/index.ts` - API_URL changed to api.recall.team

**Pending:** GitHub OAuth callback URL needs updating to `https://api.recall.team/auth/github/callback`

## What's Working
1. One-command install: `npx recall-mcp-server install <token>`
2. GitHub OAuth signup/login flow
3. Dashboard with team management
4. Team invites with email + role
5. Auto-context loading via project CLAUDE.md
6. Auto-import of sessions on MCP startup

## Architecture
- Encrypted `.recall/` files in git (useless without key)
- Team encryption key on Recall servers
- Valid seat = CLI fetches key, decrypts, loads context
- Project CLAUDE.md ensures Claude calls Recall on session start

## Key Files
- `/mcp/` - MCP server (npm package)
- `/web/` - Next.js dashboard (Cloudflare Pages)
- `/cloud/` - Hono API (Cloudflare Workers)
- `/cloud/wrangler.stoodio.toml` - Stoodio deployment config

---
*medium.md = session history | large.md = full transcripts*
