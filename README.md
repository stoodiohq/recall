# Recall

**Team memory for AI coding assistants.**

Clone the repo. Know everything.

---

## The Problem

AI coding assistants (Claude Code, Cursor, Codex, Gemini CLI) are powerful, but they have a critical flaw: **they forget everything between sessions.**

Every time you start a new session, your AI assistant starts from scratch. It doesn't know:
- What you built yesterday
- Why you made certain architectural decisions
- What errors your teammate already solved
- The patterns and conventions your team follows

This means:
- **Repeated context setting** - You explain the same things over and over
- **Duplicated mistakes** - Your AI suggests solutions your teammate already tried and failed
- **Lost knowledge** - When developers leave, their AI-assisted context leaves with them
- **No shared learning** - Each team member's AI operates in isolation

## The Solution

Recall captures context from AI coding sessions and stores it in your git repository. When anyone clones the repo, their AI assistant immediately knows everything the team has learned.

**It's git-native.** No proprietary cloud. No vendor lock-in. Just markdown files that travel with your code.

---

## How It Works

### 1. Install

```bash
curl -fsSL https://recall.team/i | sh
```

Or with npm:

```bash
npm install -g recall-cli
```

### 2. Initialize in your repo

```bash
cd your-project
recall init
```

This creates a `.recall/` folder in your repository.

### 3. Work normally

Use Claude Code, Cursor, Codex, or Gemini CLI as you normally would. Recall runs in the background.

### 4. Save context

```bash
recall save
```

This extracts sessions from your AI tools and generates context snapshots.

### 5. Share via git

```bash
git add .recall
git commit -m "Update team context"
git push
```

When teammates pull, their AI assistants can read the shared context.

---

## What Gets Captured

Recall extracts and categorizes:

- **Sessions** - What you worked on and when
- **Decisions** - Architectural choices, library selections, pattern adoptions
- **Errors Resolved** - Problems solved so they don't get re-solved
- **Files Touched** - Which parts of the codebase were involved

Each event is attributed to a team member (via git user) so you know who learned what.

---

## The .recall Folder

```
your-project/
├── .git/
├── .recall/
│   ├── events/
│   │   └── events.jsonl      # Source of truth - all events
│   └── snapshots/
│       ├── small.md          # Quick context (~500 tokens)
│       ├── medium.md         # Recent sessions (~5k tokens)
│       └── large.md          # Full history (~50k tokens)
├── src/
└── package.json
```

### Snapshots

AI assistants can read the appropriate snapshot based on context window:

- **small.md** - Current focus, key decisions, things to avoid. Perfect for quick questions.
- **medium.md** - Last 2 weeks of sessions. Good for ongoing work.
- **large.md** - Complete history. For deep dives and onboarding.

### Events

The `events.jsonl` file is the source of truth. Each line is a JSON event:

```json
{
  "id": "01JGXYZ...",
  "ts": "2025-01-02T15:30:00Z",
  "type": "decision",
  "tool": "claude-code",
  "user": "ray@example.com",
  "summary": "Chose PostgreSQL over MongoDB for relational data integrity",
  "files": ["src/db/schema.ts", "src/db/migrations/001.sql"]
}
```

Snapshots are regenerated from events, so you can always rebuild them.

---

## Supported AI Tools

| Tool | Status | Session Location |
|------|--------|------------------|
| Claude Code | ✅ Supported | `~/.claude/projects/` |
| Cursor | 🔜 Coming | `~/Library/Application Support/Cursor/` |
| Codex (OpenAI) | ✅ Supported | `~/.codex/` |
| Gemini CLI | ✅ Supported | `~/.gemini/` |

---

## Target Audience

### Primary: Engineering Teams Using AI Assistants

- Teams of 5-50 developers
- Heavy users of Claude Code, Cursor, or similar tools
- Working on complex codebases where context matters
- Want to preserve institutional knowledge

### Use Cases

1. **Onboarding** - New developers clone the repo and their AI immediately knows the project history
2. **Team continuity** - When someone leaves, their context stays
3. **Cross-timezone collaboration** - Night shift picks up where day shift left off
4. **Audit trail** - See who decided what and when

---

## Tech Stack

### CLI (`/cli`)

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **Build**: tsup (esbuild-based)
- **Dependencies**: commander (CLI), chalk (colors), ulid (IDs), glob (file matching)

### Landing Page (`/web`)

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Font**: Geist (Vercel)

### Cloud API (`/cloud`)

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Cloudflare D1 (planned)
- **Auth**: GitHub OAuth + email/password (planned)
- **Payments**: Stripe (planned)

---

## Architecture

### Git-Native by Design

The core insight: **git already solves distributed collaboration.** We don't need another sync mechanism.

- Events and snapshots are just files in the repo
- Sharing happens through normal git push/pull
- Merge conflicts are handled by git
- Works offline, no cloud dependency for core functionality

### Cloud is Optional

The cloud layer provides:
1. **Licensing** - Validate paid subscriptions
2. **AI Summarization** - Smarter summaries than template-based (optional upgrade)
3. **Analytics** - Team activity dashboards (future)

But the core product works entirely locally. You could use Recall without ever touching the cloud.

### Event Sourcing

`events.jsonl` is the source of truth. Snapshots are derived views that can be regenerated anytime. This means:
- No data loss from snapshot corruption
- Can rebuild with different summarization strategies
- Full audit trail of all captured context

---

## Pricing

| Plan | Price | Developers | Features |
|------|-------|------------|----------|
| Starter | $49/mo | Up to 5 | Full context capture, AI summaries |
| Team | $149/mo | Up to 20 | Everything + analytics dashboard |
| Business | $399/mo | Up to 50 | Everything + SSO, priority support |
| Enterprise | Custom | 50+ | Custom deployment, dedicated support |

**No free tier.** This is a paid product for professional teams.

---

## Roadmap

### Phase 1: Local CLI (Complete)
- [x] Session extraction from Claude Code, Codex, Gemini
- [x] Event storage in JSONL format
- [x] Snapshot generation (small/medium/large)
- [x] Git-native storage in `.recall/` folder

### Phase 2: Team Features (In Progress)
- [ ] License validation
- [ ] GitHub OAuth + email/password auth
- [ ] Stripe payment integration
- [ ] Cursor session extraction

### Phase 3: Intelligence
- [ ] AI-powered summarization (Claude API)
- [ ] Smart deduplication across team members
- [ ] Decision clustering and categorization

### Phase 4: Analytics
- [ ] Team activity dashboard
- [ ] Knowledge graph visualization
- [ ] Onboarding effectiveness metrics

---

## Development

### Prerequisites

- Node.js 18+
- npm or pnpm

### Setup

```bash
# Clone the repo
git clone https://github.com/stoodiohq/recall.git
cd recall

# Install CLI dependencies
cd cli
npm install
npm run build
npm link  # Makes 'recall' available globally

# Install web dependencies
cd ../web
npm install
npm run dev  # Runs on localhost:3003

# Install cloud dependencies
cd ../cloud
npm install
npm run dev  # Runs Wrangler dev server
```

### Project Structure

```
recall/
├── cli/                 # Node.js CLI
│   ├── src/
│   │   ├── commands/    # init, save, status, sync
│   │   ├── extractors/  # claude-code, cursor, codex, gemini
│   │   ├── core/        # storage, snapshots, types
│   │   └── index.ts     # Entry point
│   └── package.json
│
├── web/                 # Next.js landing page
│   ├── src/
│   │   ├── app/         # App router pages
│   │   └── components/  # React components
│   └── package.json
│
├── cloud/               # Cloudflare Workers API
│   ├── src/
│   │   └── index.ts     # Hono API
│   └── wrangler.toml
│
└── .recall/             # Recall's own context (we use our own product)
```

---

## Contributing

This is currently a private project. If you're interested in contributing, reach out to the team.

---

## License

Proprietary. All rights reserved.

---

## Contact

- Website: [recall.team](https://recall.team)
- Email: hello@recall.team
- GitHub: [@stoodiohq](https://github.com/stoodiohq)
