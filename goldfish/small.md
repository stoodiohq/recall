# Recall - Team Memory for AI Coding Assistants

Sessions: 14 | Last: 2026-01-06
Tokens: small ~475 | medium ~1.1k | large ~1.3k

## Current Status
- **MCP Server:** LIVE on npm as `recall-mcp-server@0.6.0`
- **Web:** LIVE at https://recall.team (Cloudflare Pages - Stoodio account)
- **API:** https://api.recall.team (Cloudflare Workers - Stoodio account)
- **Core Loop:** WORKING - Auto-import on startup, encryption fixed

## Latest Session (2026-01-06) - SECURITY AUDIT & FIXES

### Completed Today
1. **Security Audit Phase 1 (CRITICAL) - ALL FIXED:**
   - C1: Stripe webhook signature verification - FIXED
   - C2: OAuth state parameter validation (CSRF protection) - FIXED
   - C3: JWT token in URL replaced with auth code flow - FIXED

2. **Crypto Key Fix:**
   - `RangeError: Invalid key length` was blocking all sync
   - Root cause: `team_ray_001` had placeholder key (18 bytes instead of 32)
   - Fix: Rotated key via `/keys/rotate` endpoint
   - Added validation in `encrypt()` with helpful error message

3. **Published v0.6.0 to npm:**
   - Cleaned debug logging
   - Key validation added
   - All users get auto-sync feature

### Pending Security Work (Phase 2-4)
- H1: GitHub access token stored in plain text
- H2: No API rate limiting
- H3-H4: Additional high severity items
- Medium severity: 5 issues
- Low severity: 3 issues

## Architecture
- Encrypted `.recall/` files in git (useless without key)
- AES-256-GCM encryption (requires 32-byte key, ~44 chars base64)
- Team encryption key on Recall servers
- Valid seat = CLI fetches key, decrypts, loads context
- Project CLAUDE.md ensures Claude calls Recall on session start

## Key Files
- `/mcp/src/index.ts` - MCP server with encrypt/decrypt, v0.6.0
- `/cloud/src/index.ts` - Hono API with security fixes
- `/web/` - Next.js dashboard (Cloudflare Pages)

---
*medium.md = session history | large.md = full transcripts*
