# Recall: Cloudflare Migration Plan

**From:** Ray.hernandez@gmail.com's Account (Personal)
**To:** Stoodio (Business Account)
**Date:** 2026-01-06

---

## Executive Summary

Migrate all Recall infrastructure from personal Cloudflare account to Stoodio business account while maintaining zero downtime. Personal account remains intact until Stoodio is verified working.

---

## Current Infrastructure Inventory

### 1. Cloudflare Workers (API)
- **Name:** `recall-api`
- **URL:** `https://recall-api.stoodiohq.workers.dev`
- **Source:** `/cloud/src/index.ts` (78KB)
- **Config:** `/cloud/wrangler.toml`

### 2. D1 Database
- **Name:** `recall-db`
- **ID:** `eae65f18-e27e-4d71-b94f-80142841688a`
- **Migrations:** 9 files (0001 through 0009)
- **Tables:** users, teams, repos, encryption_keys, team_invites, memory_access_logs

### 3. Worker Secrets (set via `wrangler secret put`)
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `JWT_SECRET`

### 4. Cloudflare Pages (Web Dashboard)
- **Source:** `/web/` (Next.js 15)
- **Framework:** @cloudflare/next-on-pages
- **Domain:** recall.team

### 5. DNS
- **Domain:** recall.team
- **Zone:** Managed on Cloudflare

### 6. MCP Server (npm)
- **Package:** `recall-mcp-server`
- **Version:** 0.4.9
- **Hardcoded API URL:** `https://recall-api.stoodiohq.workers.dev` (line 21 of index.ts)

---

## Migration Strategy

**Approach:** Blue-Green deployment
- Deploy everything to Stoodio (green)
- Test thoroughly on Stoodio
- DNS cutover only after verified
- Personal (blue) remains as fallback

---

## Pre-Migration Checklist

- [ ] Verify access to both Cloudflare accounts
- [ ] Export current D1 database
- [ ] Document all current secrets
- [ ] Backup wrangler.toml
- [ ] Note current GitHub OAuth callback URLs

---

## Phase 1: Stoodio Account Setup

### Step 1.1: Verify Stoodio Account Access
```bash
# List available accounts
wrangler whoami

# Should show both:
# - Ray.hernandez@gmail.com's Account
# - Stoodio
```

### Step 1.2: Create D1 Database in Stoodio
```bash
cd /Users/rayhernandez/Library/CloudStorage/Dropbox-Personal/Goldfish/personal/recall/cloud

# Create new database in Stoodio account
CLOUDFLARE_ACCOUNT_ID=d3e569d2d49281d2d3ebe1eb5069dea4 npx wrangler d1 create recall-db

# Save the new database ID (will be different from personal)
# Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Step 1.3: Run All Migrations on New Database
```bash
cd /Users/rayhernandez/Library/CloudStorage/Dropbox-Personal/Goldfish/personal/recall/cloud

# Set account ID for Stoodio
export CLOUDFLARE_ACCOUNT_ID=d3e569d2d49281d2d3ebe1eb5069dea4

# Run each migration in order (update wrangler.toml database_id first!)
npx wrangler d1 execute recall-db --file=migrations/0001_initial.sql --remote
npx wrangler d1 execute recall-db --file=migrations/0002_encryption_keys.sql --remote
npx wrangler d1 execute recall-db --file=migrations/0003_onboarding_fields.sql --remote
npx wrangler d1 execute recall-db --file=migrations/0004_repos_table.sql --remote
npx wrangler d1 execute recall-db --file=migrations/0005_repo_initialized.sql --remote
npx wrangler d1 execute recall-db --file=migrations/0006_team_invites.sql --remote
npx wrangler d1 execute recall-db --file=migrations/0007_mcp_connections.sql --remote
npx wrangler d1 execute recall-db --file=migrations/0008_user_website.sql --remote
npx wrangler d1 execute recall-db --file=migrations/0009_memory_access_logs.sql --remote
```

### Step 1.4: Export Data from Personal D1
```bash
cd /Users/rayhernandez/Library/CloudStorage/Dropbox-Personal/Goldfish/personal/recall/cloud

# Export from personal account
CLOUDFLARE_ACCOUNT_ID=f2ef265e3ed726d152ec6ff27eab93a1 npx wrangler d1 export recall-db --output=recall-db-backup.sql --remote

# Import to Stoodio (after migrations)
CLOUDFLARE_ACCOUNT_ID=d3e569d2d49281d2d3ebe1eb5069dea4 npx wrangler d1 execute recall-db --file=recall-db-backup.sql --remote
```

**Note:** We have real data to migrate:
- 2 users (Ray + Steven)
- 1 team with encryption key
- This data MUST be migrated for existing encrypted .recall files to work

---

## Phase 2: Worker Deployment to Stoodio

### Step 2.1: Create wrangler.toml for Stoodio
```bash
# Create Stoodio-specific config
cp cloud/wrangler.toml cloud/wrangler.stoodio.toml
```

Update `wrangler.stoodio.toml`:
```toml
name = "recall-api"
main = "src/index.ts"
compatibility_date = "2024-12-30"
compatibility_flags = ["nodejs_compat"]
workers_dev = true
account_id = "STOODIO_ACCOUNT_ID"  # Add this line

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "recall-db"
database_id = "NEW_STOODIO_DATABASE_ID"  # From Step 1.2
```

### Step 2.2: Deploy Worker to Stoodio
```bash
cd /Users/rayhernandez/Library/CloudStorage/Dropbox-Personal/Goldfish/personal/recall/cloud

# Deploy using Stoodio config
wrangler deploy --config wrangler.stoodio.toml
```

### Step 2.3: Set Secrets on Stoodio Worker
```bash
# Set each secret (will prompt for value)
wrangler secret put GITHUB_CLIENT_ID --config wrangler.stoodio.toml
wrangler secret put GITHUB_CLIENT_SECRET --config wrangler.stoodio.toml
wrangler secret put JWT_SECRET --config wrangler.stoodio.toml
```

**IMPORTANT:** You'll need the actual secret values from the personal account or regenerate them:
- GitHub OAuth: May need new credentials from StoodioHQ GitHub org
- JWT_SECRET: Can generate new one, but will invalidate existing tokens

### Step 2.4: Verify Worker Deployment
```bash
# Test the health endpoint
curl https://recall-api.STOODIO_SUBDOMAIN.workers.dev/health

# Test auth endpoint
curl https://recall-api.STOODIO_SUBDOMAIN.workers.dev/auth/me
```

---

## Phase 3: Pages Deployment to Stoodio

### Step 3.1: Create Pages Project in Stoodio
Via Cloudflare Dashboard:
1. Go to Stoodio account
2. Pages > Create a project
3. Connect to Git (or upload directly)
4. Set build settings:
   - Framework: Next.js
   - Build command: `npm run build`
   - Build output: `.vercel/output/static`

Or via CLI:
```bash
cd /Users/rayhernandez/Library/CloudStorage/Dropbox-Personal/Goldfish/personal/recall/web

# Deploy to Stoodio
wrangler pages deploy .vercel/output/static --project-name=recall-web --account-id=STOODIO_ACCOUNT_ID
```

### Step 3.2: Verify Pages Deployment
```bash
# Test on Stoodio pages URL
curl https://recall-web.pages.dev
```

---

## Phase 4: DNS Migration

### Step 4.1: Add Domain to Stoodio Account
Via Cloudflare Dashboard:
1. Stoodio account > Add a site
2. Enter: recall.team
3. Select plan (free is fine)
4. **DO NOT change nameservers yet**

### Step 4.2: Export DNS Records from Personal
```bash
# Via dashboard: Personal account > recall.team > DNS > Export
# Or use API to get all records
```

### Step 4.3: Import DNS Records to Stoodio
Manually recreate all DNS records in Stoodio:
- A/AAAA records for root domain
- CNAME for www
- Any other records (MX, TXT, etc.)

### Step 4.4: Configure Custom Domains on Stoodio

**For Worker:**
```bash
# Add custom domain to worker
wrangler routes add 'api.recall.team/*' --zone-name recall.team --config wrangler.stoodio.toml
```

**For Pages:**
Via Dashboard:
1. Stoodio > Pages > recall-web > Custom domains
2. Add: recall.team
3. Add: www.recall.team

---

## Phase 5: Pre-Cutover Testing

### Step 5.1: Test API on Stoodio (using workers.dev URL)
```bash
# Health check
curl https://recall-api.STOODIO.workers.dev/health

# Auth check (with a test token)
curl -H "Authorization: Bearer TEST_TOKEN" https://recall-api.STOODIO.workers.dev/auth/me

# Team key check
curl -H "Authorization: Bearer TEST_TOKEN" https://recall-api.STOODIO.workers.dev/keys/team
```

### Step 5.2: Test Web Dashboard
- Visit Stoodio pages URL
- Complete login flow
- Verify OAuth callback works

### Step 5.3: Update GitHub OAuth Callback (if different domain during testing)
Go to GitHub > Settings > Developer settings > OAuth Apps > Recall
- Add temporary callback URL for testing

---

## Phase 6: DNS Cutover

**Only proceed when Phase 5 passes completely**

### Step 6.1: Lower TTL on Personal DNS (24h before cutover)
```bash
# Set TTL to 60 seconds on all records
# This allows faster propagation when we switch
```

### Step 6.2: Change Nameservers
Update nameservers at domain registrar (GoDaddy? Cloudflare?) to point to Stoodio:
1. Go to registrar
2. Update nameservers to Stoodio's assigned nameservers
3. Wait for propagation (up to 48h, usually faster)

### Step 6.3: Verify DNS Propagation
```bash
# Check nameservers
dig NS recall.team

# Check A record resolution
dig A recall.team

# Check from multiple locations
# https://dnschecker.org
```

---

## Phase 7: MCP Server Update

### Step 7.1: Update API URL in MCP Server
Edit `/mcp/src/index.ts` line 21:
```typescript
// OLD
const API_URL = 'https://recall-api.stoodiohq.workers.dev';

// NEW (after DNS cutover)
const API_URL = 'https://api.recall.team';
```

Or if keeping workers.dev URL during transition:
```typescript
const API_URL = 'https://recall-api.STOODIO_SUBDOMAIN.workers.dev';
```

### Step 7.2: Bump Version and Publish
```bash
cd /Users/rayhernandez/Library/CloudStorage/Dropbox-Personal/Goldfish/personal/recall/mcp

# Update version in package.json (0.4.9 -> 0.5.0)
npm version minor

# Build
npm run build

# Publish
npm publish
```

### Step 7.3: Update CLAUDE.md Instructions
Notify users to update:
```bash
# Reinstall to get new version
npx recall-mcp-server@latest install <token>
```

---

## Phase 8: Post-Migration Verification

### Step 8.1: Full Flow Test
1. New user signup via GitHub OAuth
2. Create team
3. Initialize Recall in a test repo
4. Test all MCP tools:
   - recall_auth
   - recall_get_context
   - recall_get_history
   - recall_save_session
   - recall_init

### Step 8.2: Existing User Test
1. Login with existing user
2. Verify team access
3. Verify encrypted files decrypt correctly

### Step 8.3: Check Logs
```bash
# Worker logs
wrangler tail --config wrangler.stoodio.toml

# Look for errors, failed requests
```

---

## Phase 9: Cleanup (After 1 Week of Stable Operation)

### Step 9.1: Remove from Personal Account
**DO NOT do this until Stoodio is verified stable for at least 1 week**

1. Delete Worker from personal account
2. Delete D1 database from personal account
3. Delete Pages project from personal account
4. Remove DNS zone from personal account

### Step 9.2: Update Documentation
- Update README
- Update docs site
- Update any hardcoded URLs

---

## Rollback Plan

If anything goes wrong during migration:

### DNS Rollback
1. Change nameservers back to personal account
2. Wait for propagation

### API Rollback
1. MCP server still works with personal account until DNS changes
2. Personal Worker remains running as fallback

### Database Rollback
1. Personal D1 database still has all data
2. No data migration needed for rollback

---

## Account IDs (Verified)

```
Personal Account ID: f2ef265e3ed726d152ec6ff27eab93a1
Stoodio Account ID:  d3e569d2d49281d2d3ebe1eb5069dea4
Personal D1 DB ID:   eae65f18-e27e-4d71-b94f-80142841688a
Stoodio D1 DB ID:    _______________________ (after creation in Phase 1)
```

## Current Database Contents (as of 2026-01-06)

**Tables:** users, teams, team_members, api_tokens, license_activations, team_keys, repos, team_invites, memory_access_logs, d1_migrations

**Data to migrate:**
- Users: 2 (Ray Hernandez, Steven Ray)
- Teams: 1 (Stoodio a)
- Team Keys: 1 (encryption key)
- Team Members: TBD
- API Tokens: TBD
- Memory Access Logs: TBD

---

## Secrets to Migrate

Collect these values before migration:

```
GITHUB_CLIENT_ID:     _______________________
GITHUB_CLIENT_SECRET: _______________________
JWT_SECRET:           _______________________
```

**Note:** If GitHub OAuth is from StoodioHQ org, may already be correct. If from personal GitHub, need to create new OAuth app under StoodioHQ.

---

## Estimated Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Phase 1: Setup | 30 min | Database creation, migrations |
| Phase 2: Worker | 15 min | Deploy, set secrets |
| Phase 3: Pages | 15 min | Deploy web dashboard |
| Phase 4: DNS Prep | 30 min | Add domain, configure records |
| Phase 5: Testing | 1-2 hours | Full verification |
| Phase 6: DNS Cutover | 24-48h | Propagation time |
| Phase 7: MCP Update | 15 min | After DNS verified |
| Phase 8: Verification | 1 hour | Full flow tests |
| Phase 9: Cleanup | After 1 week | Remove from personal |

**Total Active Work:** ~4-5 hours
**Total Elapsed Time:** ~3 days (DNS propagation)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| DNS propagation delay | Users can't access | Keep personal as fallback |
| Database data loss | Critical | Export backup before any changes |
| Broken OAuth | Users can't login | Test thoroughly before cutover |
| MCP package breaks | Users lose memory | Test before publishing |
| Secret mismatch | API auth fails | Document all secrets |

---

## Execution Checklist

Use this to track progress:

- [ ] **Phase 1:** Stoodio Account Setup
  - [ ] 1.1 Verify account access
  - [ ] 1.2 Create D1 database
  - [ ] 1.3 Run all migrations
  - [ ] 1.4 Export/import data

- [ ] **Phase 2:** Worker Deployment
  - [ ] 2.1 Create wrangler.stoodio.toml
  - [ ] 2.2 Deploy worker
  - [ ] 2.3 Set secrets
  - [ ] 2.4 Verify deployment

- [ ] **Phase 3:** Pages Deployment
  - [ ] 3.1 Create Pages project
  - [ ] 3.2 Verify deployment

- [ ] **Phase 4:** DNS Migration
  - [ ] 4.1 Add domain to Stoodio
  - [ ] 4.2 Export DNS records
  - [ ] 4.3 Import DNS records
  - [ ] 4.4 Configure custom domains

- [ ] **Phase 5:** Pre-Cutover Testing
  - [ ] 5.1 Test API
  - [ ] 5.2 Test web dashboard
  - [ ] 5.3 Update OAuth callbacks

- [ ] **Phase 6:** DNS Cutover
  - [ ] 6.1 Lower TTL (24h before)
  - [ ] 6.2 Change nameservers
  - [ ] 6.3 Verify propagation

- [ ] **Phase 7:** MCP Server Update
  - [ ] 7.1 Update API URL
  - [ ] 7.2 Publish new version
  - [ ] 7.3 Update instructions

- [ ] **Phase 8:** Post-Migration Verification
  - [ ] 8.1 Full flow test
  - [ ] 8.2 Existing user test
  - [ ] 8.3 Check logs

- [ ] **Phase 9:** Cleanup (after 1 week)
  - [ ] 9.1 Remove from personal
  - [ ] 9.2 Update documentation

---

*Plan created: 2026-01-06*
*Prepared for execution by Claude*
