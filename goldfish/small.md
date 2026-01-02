# Recall - Team Memory for AI Coding Assistants

Tokens: small ~400 | medium ~2k | large ~10k

## What It Is
Git-native team memory for AI coding assistants (Claude Code, Cursor, Codex, Gemini CLI). Captures session context, stores in `.recall/` folder in repo, syncs via git commits.

## Key Files
- **CLI:** `/cli/` - Node.js CLI with extractors for each AI tool
- **Web:** `/web/` - Next.js landing page (recall.team)
- **Cloud:** `/cloud/` - Cloudflare Workers API

## Commands
```bash
cd cli && npm run build        # Build CLI
cd web && npm run dev          # Run landing page
cd cloud && npm run dev        # Run API locally
```

## Pricing
- Solo: Free (1 dev, 1 repo)
- Starter: $49/mo (5 devs)
- Team: $149/mo (20 devs)
- Business: $399/mo (50 devs)

## Domain
recall.team
