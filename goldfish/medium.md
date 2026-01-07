# Recall - Development History

Sessions: 14 | Updated: 2026-01-06

## 2026-01-06 (Sessions 13-14): SECURITY AUDIT & CRITICAL FIXES

### Security Audit Completed
Full security audit of Recall codebase. Found 15 issues total:
- 3 Critical (all fixed)
- 4 High (pending)
- 5 Medium (pending)
- 3 Low (pending)

### Critical Issues Fixed (Phase 1)

**C1: Stripe Webhook Signature Verification**
- Problem: Accepting webhooks without verifying Stripe signature
- Fix: Added `Stripe-Signature` header validation using `stripe.webhooks.constructEvent()`
- File: `/cloud/src/index.ts`

**C2: OAuth State Parameter (CSRF Protection)**
- Problem: GitHub OAuth flow had no state parameter
- Fix: Generate cryptographic state, store in cookie, validate on callback
- File: `/cloud/src/index.ts`

**C3: JWT Token in URL**
- Problem: Token passed in URL query params (visible in logs, bookmarks)
- Fix: Replaced with auth code flow - callback returns code, frontend exchanges for token
- Files: `/cloud/src/index.ts`, `/web/src/app/auth/callback/page.tsx`

### Crypto Key Length Bug Fixed
- Error: `RangeError: Invalid key length` blocking all sync operations
- Root cause: Test team `team_ray_001` had placeholder key `temp_key_w...` (24 chars = 18 bytes)
- AES-256-GCM requires exactly 32 bytes (44 chars base64)
- Fix: Rotated key via `POST /keys/rotate` endpoint
- Enhancement: Added validation in `encrypt()` function with descriptive error message
- File: `/mcp/src/index.ts`

### Published v0.6.0 to npm
- Removed debug console.log statements
- Added key length validation
- Bumped version in package.json and McpServer constructor

### `team_ray_001` Investigation
User asked where this came from since they never created it.
- Normal team IDs are UUIDs from `crypto.randomUUID()`
- `team_ray_001` was manually seeded test data in the database
- Team name `asdfsdafas` and placeholder key confirmed it's test data
- NOT the default for new users

---

## 2026-01-06 (Session 12): INFRASTRUCTURE MIGRATION

**Migrated ALL infrastructure from Ray's personal Cloudflare to Stoodio business account:**
- D1 Database: `recall-db` (ID: 59978e9e-eceb-4ab4-853e-241e8853fdd3)
- Worker API: `recall-api` with route api.recall.team
- Pages: `recall-web` with custom domain recall.team
- DNS Zone: recall.team (nameservers: mckenzie/miguel)

**Key files changed:**
- `/cloud/wrangler.stoodio.toml` - Stoodio deployment config
- `/cloud/src/index.ts` - Updated CORS, OAuth callback, redirects
- `/web/wrangler.toml` - Pages config with nodejs_compat
- `/mcp/src/index.ts` - API_URL changed to api.recall.team

---

## 2026-01-05 (Session 11): AUTO-IMPORT IMPLEMENTED

### The Core Problem
Steven tested Recall but his files appeared empty. When he had to run `recall_import_all_sessions` manually, Ray's feedback: "he shouldn't have to do this, if he's doing this, that means recall isn't working properly."

### The Solution (v0.4.7)
Implemented automatic session import on MCP startup:
1. **Imported sessions tracker** - `.recall/imported-sessions.json`
2. **autoImportNewSessions()** - Runs on every MCP startup
3. **Called in main()** - Non-blocking, logs results

---

## 2026-01-05 (Session 10): Bug Fixes & Steven Debugging

### Issues Fixed
1. MCP not showing in /mcp - User needed full restart (Cmd+Q)
2. Stale data from recall_get_context - Added `projectPath` parameter
3. Session file finder - Now checks parent directories
4. large.md importing - Created `recall_import_all_sessions` tool

---

## 2026-01-05 (Sessions 7-9): Auto-Context Loading Fix

### The Problem
Steven installed Recall, opened Claude, said "summarize this project" - Recall didn't get called. MCP tools are opt-in.

### The Solution (v0.3.2)
Project CLAUDE.md on save/init with "CRITICAL: call `recall_get_context` immediately"

---

## 2026-01-05 (Sessions 5-6): MCP Server Launch
- Published to npm as `recall-mcp-server`
- One-command install: `npx recall-mcp-server install <token>`

---

## 2026-01-04 (Session 4): Product Definition
**The value is in READING, not writing.** When AI starts with full repo history, it never repeats mistakes.

### Licensing Model
- Encrypted `.recall/` files in git (useless without key)
- Team encryption key stored on Recall servers
- Valid seat = CLI fetches key, decrypts, loads context

---

## Earlier Sessions: Initial Build
- 2024-12-30: Built complete MVP
- CLI with 4 extractors, Next.js landing, Cloudflare Workers API

---
*See large.md for complete session transcripts*
