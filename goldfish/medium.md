# Recall - Development History

## 2024-12-30: Initial Build

### Architecture Decisions
- **Event Sourcing:** events.jsonl is source of truth, snapshots (small/medium/large.md) are derived views
- **Git-Native:** All memory stored in `.recall/` folder committed to repo, syncs via git
- **Hexagonal CLI:** Commands → Use Cases → Domain → Adapters pattern
- **Cloudflare Workers:** Edge-first API with Hono framework

### CLI Structure
```
cli/src/
├── commands/       # init, save, status, sync
├── extractors/     # claude-code, cursor, codex, gemini
├── core/           # types, storage, snapshots
└── utils/          # git helpers
```

### CLI Commands
- `recall init` - Initialize .recall/ in repo
- `recall save` - Extract sessions, append events, regenerate snapshots
- `recall status` - Show current state
- `recall sync` - Sync with cloud for AI summaries

### Extractors
| Tool | Location | Format |
|------|----------|--------|
| Claude Code | ~/.claude/projects/[base64-path]/*.jsonl | JSONL |
| Cursor | ~/Library/.../workspaceStorage/[hash]/state.vscdb | SQLite (stub) |
| Codex | ~/.codex/sessions/YYYY/MM/DD/*.jsonl | JSONL |
| Gemini | ~/.gemini/tmp/[hash]/chats/*.json | JSON |

### Landing Page Sections
1. Hero with animated terminal
2. Problem (re-explaining, repeated failures, lost knowledge)
3. How It Works (3 steps: install, work, share)
4. Product (show .recall/ folder structure)
5. Works With (platform logos)
6. Pricing (Free/Starter/Team/Business)
7. Final CTA with copy-paste install command

### Visual Language
- Dark theme (#09090B base)
- Cyan accent (#22D3EE)
- Geist typography
- Minimal, developer-focused

### Cloud API Endpoints
- GET /health - Health check
- POST /auth/token - Exchange code for API token
- GET /auth/me - Current user
- GET /license/check - Validate license
- POST /summarize - AI-powered summaries (returns small.md, medium.md)
- GET /i - Install script (curl | sh)

### Testing
CLI tested with:
```bash
# In test repo
recall init   # Creates .recall/ structure
recall status # Shows state
recall save   # Extracts and saves sessions
```

### Next Steps
1. Cursor extractor (needs better-sqlite3)
2. Stripe integration for billing
3. Clerk auth for cloud
4. Deploy landing page to Vercel
5. Deploy API to Cloudflare
6. Publish CLI to npm
