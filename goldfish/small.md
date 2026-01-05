# Recall - Team Memory for AI Coding Assistants

Sessions: 4 | Last: 2026-01-04
Tokens: small ~1.2k | medium ~8k | large ~20k

## What It Is
Git-native team memory for AI coding assistants. Captures session context, creates AI summaries, stores encrypted in `.recall/` folder, syncs via git. **The value is in READING** - AI starts every session with full repo history.

## Current Status
- **Web:** LIVE at https://recall.team
- **API:** https://recall-api.stoodiohq.workers.dev
- **GitHub:** stoodiohq/recall
- **Phase:** Product definition complete, architecture locked in

## Core Value Proposition
AI reads repo memory at session start → knows what was built, what failed, why decisions were made → never repeats mistakes, never starts from zero.

## Architecture Decisions (Session 4)

### Licensing: Encrypted Summaries
- `.recall/*.enc` files in git (encrypted, useless without key)
- Team encryption key stored on Recall servers
- Valid seat = CLI fetches key, decrypts, loads into AI
- No seat = "Contact admin for access" (AI starts from zero)
- Recall manages keys, users never see them

### UX: Invisible/Automatic
- First user signs up → team created, seat assigned
- Recall runs invisibly in background
- Session end → auto-capture, summarize, encrypt, commit
- Session start → check seat, decrypt, load context
- Hotwords: "remember" (medium), "ultra remember" (large)
- No manual commands in daily workflow

### Pricing: Per Seat
- Free: Solo dev, 1 repo, 30 days
- Team: $12/user/mo, unlimited repos, 1 year history
- Enterprise: $25-35/user/mo, BYOK, SSO, unlimited history

### AI Agnostic
- **Tools:** Claude Code, Cursor, Codex, Gemini CLI, Anti-gravity, VS Code + Copilot
- **Summarization:** Recall-owned by default, BYOK for enterprise

## Key Files
- **CLI:** `/cli/` - Node.js, extractors for each AI tool
- **Web:** `/web/` - Next.js static on Cloudflare Pages
- **Cloud:** `/cloud/` - Hono + D1 API
- **Research:** `/research/dev-team-workflows.md`

## What's Built
- Website, OAuth, dashboard, mock checkout
- CLI structure with extractors
- Local snapshot generation

## What's NOT Built
- AI summarization (the core feature)
- Encryption layer
- License/seat validation
- npm publishing

---
*medium.md = session history | large.md = full transcripts*
