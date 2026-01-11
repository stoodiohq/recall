# TestApp - Team Context

## Project Overview
TestApp is a SaaS platform for team collaboration.

## Tech Stack
- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, PostgreSQL
- **Infrastructure:** Vercel, Supabase, Redis
- **Testing:** Vitest, Playwright

## Current Work
Building the notification system with real-time updates.

## Active Decisions
- **Use WebSockets for real-time:** Lower latency than polling
- **PostgreSQL for main data:** ACID compliance for financial data
- **Redis for sessions:** Fast reads, TTL support

## Team Conventions
- All functions should have TypeScript types
- Use async/await, never callbacks
- Tests required before merging to main
- Commit messages follow conventional commits

## Known Issues
- [ ] Memory leak in WebSocket handler (low priority)
- [ ] Slow query on users table (needs index)

## Quick Commands
```bash
npm run dev      # Start development
npm test         # Run tests
npm run build    # Production build
```
