# Team History

## Session Log

### 2024-01-15: Authentication Implementation
Implemented OAuth authentication with GitHub. Added JWT tokens for API access.
Files: src/auth.ts, src/routes/callback.ts, src/middleware/auth.ts

### 2024-01-14: Database Schema Design
Set up PostgreSQL with Prisma ORM. Created initial schema for users, teams, and projects.
Files: prisma/schema.prisma, src/db/client.ts

### 2024-01-12: Project Setup
Initialized monorepo with Turborepo. Set up Next.js frontend and Express backend.
Files: package.json, turbo.json, apps/web/*, apps/api/*

## Decision Log

### 2024-01-15: Use GitHub OAuth
**What:** Use GitHub OAuth as primary authentication method
**Why:** Team already uses GitHub; reduces friction for developer users
**Alternatives considered:**
- Google OAuth: Not all users have Google accounts
- Email/password: Security burden, password reset flows

### 2024-01-14: Use PostgreSQL over MongoDB
**What:** PostgreSQL as primary database
**Why:** Need ACID compliance for financial transactions
**Alternatives considered:**
- MongoDB: Flexible schema but weaker consistency
- MySQL: PostgreSQL has better JSON support

### 2024-01-12: Monorepo with Turborepo
**What:** Use Turborepo for monorepo management
**Why:** Efficient builds with caching, good DX
**Alternatives considered:**
- Nx: More complex, overkill for our size
- Lerna: Deprecated, less maintained

## Lessons Learned

### Always validate webhook signatures
After a security audit, we found our Stripe webhook handler wasn't verifying signatures.
**Impact:** 2 hours debugging, potential security issue
**Prevention:** Add signature verification to webhook template

### PostgreSQL connection pooling
Hit connection limits in production due to missing pooling.
**Impact:** 4 hours of downtime investigation
**Prevention:** Use PgBouncer or Prisma connection pooling

## Effective Prompts

### Debugging database queries
"Show me the SQL query that Prisma generates for this code, and explain why it might be slow with 1M rows"

### Code review focus
"Review this PR focusing on: 1) security issues, 2) performance concerns, 3) missing edge cases"
