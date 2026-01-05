# Recall - Development History

Sessions: 11 | Updated: 2026-01-05

## 2026-01-05 (Session 11): AUTO-IMPORT IMPLEMENTED

### The Core Problem
Steven tested Recall but his files appeared empty. When he had to run `recall_import_all_sessions` manually, Ray's feedback: "he shouldn't have to do this, if he's doing this, that means recall isn't working properly, that is literally what recall is suppose to do."

### The Solution (v0.4.7)
Implemented automatic session import on MCP startup:

1. **Imported sessions tracker** - `.recall/imported-sessions.json` tracks:
   - Which sessions have been imported
   - Their modification times (to detect updates)

2. **autoImportNewSessions()** - Runs on every MCP startup:
   - Finds all JSONL session files for the project
   - Compares with tracker by filename + mtime
   - Imports any new/updated sessions to large.md
   - Updates tracker

3. **Called in main()** - Non-blocking, logs results

Now: User opens Claude in Recall-enabled project -> MCP starts -> auto-import runs -> previous sessions already in large.md. No manual action needed.

---

## 2026-01-05 (Session 10): Bug Fixes & Steven Debugging

### Issues Fixed
1. **MCP not showing in /mcp** - User needed full restart (Cmd+Q, not just new session)
2. **Stale data from recall_get_context** - Added `projectPath` parameter and debugging output
3. **Session file finder** - Now checks parent directories too (for when Claude opened at parent level)
4. **large.md importing** - Created `recall_import_all_sessions` tool to import ALL session JSONLs

### Key Insight
cwd issue: MCP server doesn't inherit project directory from Claude. Added debugging to show what directory it's reading from.

---

## 2026-01-05 (Sessions 7-9): Auto-Context Loading Fix + Team Features

### The Core Problem We Solved
Steven Ray installed Recall, opened Claude in a Recall-enabled project, said "summarize this project" - Recall didn't get called. Why? **MCP tools are opt-in.** Claude only calls them when it thinks they're relevant.

### The Solution (v0.3.2)
1. **Project CLAUDE.md on save/init:** Creates CLAUDE.md in project root with "CRITICAL: call `recall_get_context` immediately"
2. **Startup check:** If `.recall/` exists but CLAUDE.md doesn't or lacks Recall section, auto-create it

**Steven Ray tested. It works.**

### Team Features Built
1. Team management page (`/dashboard/team`)
2. Repos page permissions (`/dashboard/repos`)
3. Activity tracking (memory_access_logs table)
4. Member deletion endpoint

---

## 2026-01-05 (Sessions 5-6): MCP Server Launch

- Published MCP server to npm as `recall-mcp-server`
- One-command install: `npx recall-mcp-server install <token>`
- Migrated GitHub OAuth from personal to StoodioHQ organization

---

## 2026-01-04 (Session 4): Product Definition

**The value is in READING, not writing.** When AI starts with full repo history, it never repeats mistakes.

### Licensing
- Encrypted `.recall/` files in git (useless without key)
- Team encryption key stored on Recall servers
- Valid seat = CLI fetches key, decrypts, loads context

---

## 2026-01-04 (Session 3): Production Deployment

- Deployed to Cloudflare Pages (https://recall.team)
- DNS moved from GoDaddy to Cloudflare
- Fixed OAuth callback URL

---

## 2024-12-30: Initial Build

Built complete MVP: CLI with 4 extractors, Next.js landing page, Cloudflare Workers API.

---
*See large.md for complete session transcripts*
