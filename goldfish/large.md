# Recall - Full Session History

## 2026-01-05: Auto-Context Loading Fix (Sessions 7-9)

### The Problem
Steven Ray installed Recall, opened Claude in a Recall-enabled project folder, said "summarize this project" - **Recall didn't get called.**

Root cause: MCP tools are opt-in. Claude only calls them when it thinks they're relevant. The global ~/.claude/CLAUDE.md instructions get buried in context and don't reliably trigger Recall.

### The Solution (Published as v0.3.2)
Two-pronged approach:

1. **Project CLAUDE.md on save/init**
   - Added `createProjectClaudeMd()` function
   - Creates/updates CLAUDE.md in project root with Recall instructions
   - Called from `recall_save_session` and new `recall_init` tool
   - Instructions say "CRITICAL: call `recall_get_context` immediately"

2. **Startup check for .recall/**
   - Added `checkProjectRecallSetup()` function
   - On MCP server startup, if `.recall/` exists:
     - If no CLAUDE.md → create it
     - If CLAUDE.md exists but no Recall section → add it
   - Outputs reminder: `[Recall] This project has team memory. Call recall_get_context`

### The Key Insight
Claude reads project-level CLAUDE.md automatically on session start. By putting instructions there ("CRITICAL: call recall_get_context"), Claude follows them.

### Steven Ray Test
1. Deleted Steven from database (again) to test fresh flow
2. Sent new invite
3. Steven installed Recall
4. Opened Claude in Recall-enabled project
5. Said "What is this project about?"
6. **Claude called recall_get_context first** - IT WORKED

### Team Features Built This Session

**Team Management Page** (`/dashboard/team`)
- Invite form: email + role (member/admin)
- Pending invites list
- Team members list
- Remove (from team) / Delete (from system) buttons

**Repos Page Permissions** (`/dashboard/repos`)
- Shows ALL team repos, not just user's GitHub repos
- Team repos from other members show purple "Team" badge
- "Added by [name]" for repos you can't toggle
- `canToggle` based on who enabled the repo

**Member Deletion Endpoint** (`DELETE /teams/members/:userId`)
- `fullDelete=true` query param for complete removal
- Deletes from: memory_access_logs, team_members, api_tokens
- Clears: team_invites.accepted_by, repos.enabled_by
- Then deletes from users table

### Database Operations for Steven Ray Deletion
```sql
DELETE FROM memory_access_logs WHERE user_id = '1adb8561-e380-4752-b06a-9edd0e21ae18';
DELETE FROM team_members WHERE user_id = '1adb8561-e380-4752-b06a-9edd0e21ae18';
DELETE FROM api_tokens WHERE user_id = '1adb8561-e380-4752-b06a-9edd0e21ae18';
UPDATE team_invites SET accepted_by = NULL WHERE accepted_by = '1adb8561-e380-4752-b06a-9edd0e21ae18';
UPDATE repos SET enabled_by = NULL WHERE enabled_by = '1adb8561-e380-4752-b06a-9edd0e21ae18';
DELETE FROM users WHERE id = '1adb8561-e380-4752-b06a-9edd0e21ae18';
```

### Files Changed
```
/mcp/src/index.ts
  - createProjectClaudeMd() - creates/updates project CLAUDE.md
  - checkProjectRecallSetup() - startup check for .recall/
  - recall_init tool - explicit initialization
  - recall_save_session - now calls createProjectClaudeMd()
  - main() - calls checkProjectRecallSetup() on startup

/mcp/package.json - v0.3.2

/cloud/src/index.ts
  - DELETE /teams/members/:userId endpoint
  - GET /repos now includes enabledBy, enabledByName, canToggle

/web/src/app/dashboard/team/page.tsx
  - Invite form with email + role
  - Team members with remove/delete buttons

/web/src/app/dashboard/repos/page.tsx
  - Combined allRepos memo (user's + team's)
  - Team badge, permissions, "Added by" text
```

---

## 2024-12-30: Project Creation

### Session: Initial Build

Built complete MVP in single session:

1. **CLI (Node.js/TypeScript)**
   - 4 commands: init, save, status, sync
   - 4 extractors: Claude Code, Cursor (stub), Codex, Gemini
   - Event sourcing with JSONL storage
   - Template-based snapshot generation
   - Git integration (user detection, repo detection)

2. **Landing Page (Next.js 15)**
   - Full responsive design following UX spec
   - Animated terminal hero
   - 8 sections with Framer Motion animations
   - Tailwind with custom design tokens
   - Geist typography

3. **Cloud API (Cloudflare Workers)**
   - Hono framework
   - Auth endpoints (mock for now)
   - License checking
   - Summarization endpoint
   - Install script at /i

### Key Insights from Ultrathink
- CLI IS the product, everything else is distribution
- Build capture mechanism first, cloud/landing page second
- Local-only mode lets dogfooding happen immediately
- Template-based summaries work while AI integration is developed


---

## Session: 16a13f04...
**Date:** 2026-01-05 15:55
**Messages:** 55

**First message:**
> i'd like for you to tell me about chitter, and i'd like for you to ultraremember

**Files touched:**
- `/Users/rayhernandez/Library/CloudStorage/Dropbox-Personal/Goldfish/personal/recall/goldfish/large.md`
- `/Users/rayhernandez/Library/CloudStorage/Dropbox-Personal/Goldfish/personal/recall/goldfish/medium.md`
- `/Users/rayhernandez/Library/CloudStorage/Dropbox-Personal/Goldfish/personal/recall/goldfish/small.md`

**Tools:** Bash, Glob, Read, mcp__recall__recall_get_context, mcp__recall__recall_get_history, mcp__recall__recall_get_transcripts

*Raw transcript in ~/.claude session files*