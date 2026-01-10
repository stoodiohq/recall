# Recall.team Frontend Gap Analysis

**Analysis Date:** January 10, 2026
**Plan Document:** `/plan/recall-team-frontend-plan.md`
**Implementation:** `/web/src/app/`

---

## Executive Summary

The frontend implementation deviates significantly from the plan in route structure (using `/dashboard` instead of `/app`) and signup flow architecture. Many features are implemented but under different routes. The core dashboard, repos, team, and settings functionality exists but the signup funnel specified in the plan is not implemented as designed.

**Critical Finding:** The plan specifies a detailed 4-step signup funnel (`/signup/plan` -> `/signup/payment` -> `/signup/connect` -> `/signup/team`). This does NOT exist in the implementation. Instead, there's a simpler `/onboarding` flow.

---

## SECTION 1: REQUIRED BY PLAN

### Site Map from Plan (Part 3, lines 39-65)

```
recall.team/
├── / (Landing Page)
├── /pricing
├── /docs
├── /login
├── /signup
│   ├── /signup/plan (Select Plan + Seats)
│   ├── /signup/payment (Add Payment Method)
│   ├── /signup/connect (GitHub OAuth)
│   └── /signup/team (Create Team Details)
├── /join/[invite-code] (Join existing team)
├── /app (Dashboard - requires auth)
│   ├── /app/repos
│   │   └── /app/repos/[id] (Single repo view)
│   ├── /app/team
│   │   ├── /app/team/members
│   │   └── /app/team/invite
│   ├── /app/install
│   ├── /app/settings
│   │   ├── /app/settings/profile
│   │   ├── /app/settings/billing
│   │   └── /app/settings/team
│   └── /app/activity
└── /blog (Future)
```

---

## SECTION 2: ACTUALLY BUILT

### Files in `/web/src/app/`

```
/                                    -> page.tsx (Landing)
/pricing                             -> pricing/page.tsx
/docs                                -> docs/page.tsx
/checkout                            -> checkout/page.tsx (NOT in plan)
/onboarding                          -> onboarding/page.tsx (NOT in plan)
/onboarding/success                  -> onboarding/success/page.tsx (NOT in plan)
/invite                              -> invite/page.tsx
/auth/callback                       -> auth/callback/page.tsx (NOT in plan)
/dashboard                           -> dashboard/page.tsx
/dashboard/repos                     -> dashboard/repos/page.tsx
/dashboard/repos/[id]                -> dashboard/repos/[id]/page.tsx
/dashboard/team                      -> dashboard/team/page.tsx
/dashboard/install                   -> dashboard/install/page.tsx
/dashboard/activity                  -> dashboard/activity/page.tsx
/dashboard/settings                  -> dashboard/settings/page.tsx
/dashboard/settings/profile          -> dashboard/settings/profile/page.tsx
/dashboard/settings/billing          -> dashboard/settings/billing/page.tsx
/dashboard/settings/team             -> dashboard/settings/team/page.tsx
```

---

## SECTION 3: ROUTE MISMATCHES

| Plan Route | Actual Route | Status |
|------------|--------------|--------|
| `/app` | `/dashboard` | **WRONG** - All dashboard routes use `/dashboard` prefix |
| `/app/repos` | `/dashboard/repos` | **WRONG** - Different prefix |
| `/app/repos/[id]` | `/dashboard/repos/[id]` | **WRONG** - Different prefix |
| `/app/team` | `/dashboard/team` | **WRONG** - Different prefix |
| `/app/team/members` | N/A | **MISSING** - Separate route doesn't exist |
| `/app/team/invite` | N/A | **MISSING** - Separate route doesn't exist |
| `/app/install` | `/dashboard/install` | **WRONG** - Different prefix |
| `/app/settings` | `/dashboard/settings` | **WRONG** - Different prefix |
| `/app/settings/profile` | `/dashboard/settings/profile` | **WRONG** - Different prefix |
| `/app/settings/billing` | `/dashboard/settings/billing` | **WRONG** - Different prefix |
| `/app/settings/team` | `/dashboard/settings/team` | **WRONG** - Different prefix |
| `/app/activity` | `/dashboard/activity` | **WRONG** - Different prefix |
| `/login` | N/A | **MISSING** - No dedicated login page |
| `/signup` | N/A | **MISSING** - No signup root page |
| `/signup/plan` | N/A | **MISSING** - Plan selection flow |
| `/signup/payment` | N/A | **MISSING** - Payment flow |
| `/signup/connect` | N/A | **MISSING** - GitHub connect flow |
| `/signup/team` | N/A | **MISSING** - Team creation flow |
| `/join/[invite-code]` | `/invite` | **PARTIAL** - Different route structure |

### Recommendation

**Decision needed:** Either update the plan to use `/dashboard` or rename all routes to `/app`. I recommend keeping `/dashboard` as it's more descriptive and already implemented.

---

## SECTION 4: GAPS - MISSING PAGES

### P0 (Critical - Blocking Launch)

| Missing Page | Plan Reference | What It Should Contain | Notes |
|--------------|----------------|------------------------|-------|
| `/login` | Part 11 | GitHub OAuth button, "Don't have an account? Sign up" link | Currently landing at `/` handles login |
| `/signup` | Part 3 | Entry point to signup funnel | No dedicated signup page |
| `/signup/plan` | Part 3, lines 482-529 | Plan selection (Team/Enterprise), billing toggle, seat selector, price summary | **CRITICAL** - This is the checkout entry |
| `/signup/payment` | Part 3, lines 531-582 | Stripe card form, order summary, trial messaging | Goes to `/checkout` instead but flow is different |
| `/signup/connect` | Part 3, lines 584-618 | GitHub OAuth connection step | Happens inline in onboarding |
| `/signup/team` | Part 3, lines 620-662 | Company name, website, industry inputs | Not a separate page |

### P1 (High Priority)

| Missing Page | Plan Reference | What It Should Contain | Notes |
|--------------|----------------|------------------------|-------|
| `/app/team/members` | Part 7, lines 1069-1116 | Full team member list with sessions, roles, remove/edit actions | Functionality exists in `/dashboard/team` but not separate route |
| `/app/team/invite` | Part 7, lines 1118-1163 | Email invite form, invite link generation | Functionality exists in `/dashboard/team` but not separate route |
| `/blog` | Line 64 | Blog/changelog content | Marked as "Future" in plan |

### P2 (Nice to Have)

| Missing Page | Plan Reference | What It Should Contain | Notes |
|--------------|----------------|------------------------|-------|
| Confirm Join page | Part 3, lines 698-721 | Explicit confirmation before joining team | Currently auto-joins after OAuth |

---

## SECTION 5: MISSING FEATURES PER PAGE

### Landing Page (`/`)

| Feature | Plan Reference | Status | Notes |
|---------|----------------|--------|-------|
| Hero section | Part 1, lines 76-97 | BUILT | Has headline, subhead, CTA |
| Demo animation | Part 1, lines 89-94 | PARTIAL | Has product demo but not animated scenario |
| Problem section | Part 1, lines 107-132 | BUILT | 3 pain points |
| Solution section | Part 1, lines 135-155 | BUILT | Shows what Recall captures |
| How it works | Part 1, lines 157-189 | BUILT | 3 steps |
| Trust & Security | Part 1, lines 191-212 | MISSING | No dedicated security section |
| Pricing preview | Part 1, lines 214-237 | BUILT | Shows pricing |
| Social proof | Part 1, lines 239-254 | MISSING | No testimonials yet (expected post-launch) |
| Footer | Part 1, lines 257-273 | BUILT | Has footer |

### Pricing Page (`/pricing`)

| Feature | Plan Reference | Status | Notes |
|---------|----------------|--------|-------|
| Plan cards | Part 2, lines 282-313 | BUILT | Team and Enterprise |
| Monthly/Annual toggle | Part 2, lines 309-311 | BUILT | Works correctly |
| Team vs Enterprise comparison | Part 2, lines 317-356 | BUILT | Shows data flow differences |
| FAQ section | Part 2, lines 358-396 | BUILT | All FAQs present |
| Enterprise CTA | Part 2, lines 398-410 | BUILT | Contact Sales |

### Dashboard (`/dashboard`)

| Feature | Plan Reference | Status | Notes |
|---------|----------------|--------|-------|
| Header with nav | Part 4, lines 733-734 | PARTIAL | Has header but nav is in account panel, not top nav |
| Install banner | Part 4, lines 740-752 | BUILT | Shows when MCP not connected |
| Repository list | Part 4, lines 756-774 | BUILT | Shows repos with status |
| Recent activity | Part 4, lines 778-792 | MISSING | Activity shown in separate `/dashboard/activity` page |
| Empty state (no repos) | Part 4, lines 797-828 | BUILT | Shows prompt to enable repos |
| Invite Team button | Part 4, line 737 | BUILT | In account panel |

### Repo Detail (`/dashboard/repos/[id]`)

| Feature | Plan Reference | Status | Notes |
|---------|----------------|--------|-------|
| Overview tab | Part 6, lines 959-1006 | BUILT | Shows stats and recent sessions |
| Sessions tab | Part 6, implied | BUILT | Lists sessions |
| Context tab | Part 6, lines 1008-1063 | BUILT | Shows what AI knows |
| History tab | Part 6, implied | BUILT | Commit-style history |
| Settings button | Part 6, line 955 | MISSING | No repo settings |
| Load More sessions | Part 6, line 1003 | MISSING | No pagination |

### Team Page (`/dashboard/team`)

| Feature | Plan Reference | Status | Notes |
|---------|----------------|--------|-------|
| Member list | Part 7, lines 1077-1114 | BUILT | Shows all members |
| Role badges | Part 7 | BUILT | Owner, Admin, Member |
| Session counts | Part 7, lines 1084-1086 | PARTIAL | Shows last active, not session counts |
| Edit member | Part 7, line 1092 | MISSING | No edit functionality |
| Remove member | Part 7, line 1092 | BUILT | Can remove members |
| Pending invites | Part 7, lines 1109-1112 | BUILT | Shows pending invites |
| Invite form | Part 7, lines 1130-1145 | BUILT | Can create invites |
| Invite link | Part 7, lines 1149-1160 | BUILT | Generates shareable link |
| Seat limit warning modal | Part 7, lines 1167-1185 | MISSING | No modal when over seat limit |

### Install Page (`/dashboard/install`)

| Feature | Plan Reference | Status | Notes |
|---------|----------------|--------|-------|
| Tool tabs | Part 8, lines 1204-1206 | BUILT | Claude Code, Cursor, Other |
| Install command | Part 8, lines 1214-1217 | BUILT | Shows npx command |
| API token | Part 8, lines 1222-1227 | BUILT | Shows/generates token |
| Verify command | Part 8, lines 1229-1236 | BUILT | recall_status command |
| Coming Soon state | Part 8, lines 1250-1272 | BUILT | Shows for Cursor/Other |
| Email notify form | Part 8, lines 1263-1267 | BUILT | Can submit email |

### Settings Page (`/dashboard/settings`)

| Feature | Plan Reference | Status | Notes |
|---------|----------------|--------|-------|
| Settings overview | Part 9, lines 1278-1294 | BUILT | Links to sub-pages |
| Profile settings | Part 9, lines 1296-1323 | BUILT | Name, email, GitHub |
| Billing settings | Part 9, lines 1325-1375 | BUILT | Plan, seats, payment |
| Team settings | Part 9, lines 1377-1429 | BUILT | Team info, danger zone |
| Transfer Ownership | Part 9, lines 1414-1417 | MISSING | No transfer ownership |
| Delete Team confirm | Part 9, lines 1419-1424 | BUILT | Type to confirm |

### Activity Page (`/dashboard/activity`)

| Feature | Plan Reference | Status | Notes |
|---------|----------------|--------|-------|
| Activity feed | Part 10, lines 1439-1494 | BUILT | Shows activity |
| Filters | Part 10, line 1448 | PARTIAL | Has filter by type, missing repo/member filters |
| Session details in feed | Part 10, lines 1457-1464 | PARTIAL | Shows summary, not full details |
| Load More | Part 10, line 1492 | MISSING | No pagination |

---

## SECTION 6: IMPLEMENTATION DIFFERENCES

### Signup Flow

**Plan specifies:**
```
Landing -> /signup/plan -> /signup/payment -> /signup/connect -> /signup/team -> /app
```

**Actually built:**
```
Landing -> /checkout?plan=X -> /onboarding -> /onboarding/success -> /dashboard
```

The implementation combines payment and GitHub OAuth into fewer pages. This may be intentional simplification but differs from spec.

### Join Team Flow

**Plan specifies:**
```
/join/[code] -> Connect GitHub -> Confirm Join -> /app
```

**Actually built:**
```
/invite?code=X -> GitHub OAuth -> Auto-join -> /dashboard
```

Missing the explicit confirmation step.

### Dashboard Navigation

**Plan specifies:** Top navigation bar with [Repos] [Team] [Activity] [Settings]

**Actually built:** Collapsible account panel with links, no persistent top nav

---

## SECTION 7: PRIORITY RECOMMENDATIONS

### Immediate (P0)

1. **Decide on route prefix:** `/app` vs `/dashboard` - update plan or code
2. **Add `/login` page** - Currently relies on landing page
3. **Evaluate signup funnel** - Current flow works but differs from plan

### Short-term (P1)

1. Add Trust & Security section to landing page
2. Add seat limit warning modal in team management
3. Add Transfer Ownership to team settings
4. Add Load More pagination to activity and sessions

### Later (P2)

1. Split team/members and team/invite into separate routes (if needed)
2. Add social proof section (post-launch)
3. Add blog section (future)
4. Add repo settings

---

## SECTION 8: WHAT'S WORKING WELL

Despite route differences, the core functionality is solid:

- Dashboard with setup wizard flow
- Repo management (list, enable, initialize)
- Team management (members, invites)
- Settings (profile, billing, team)
- Install instructions
- Activity feed
- Auth via GitHub OAuth

The implementation quality is high - components have:
- Loading states
- Error handling
- Empty states
- Proper TypeScript types
- Framer Motion animations
- Consistent styling

---

## Summary Table

| Category | Plan Count | Built Count | Gap |
|----------|------------|-------------|-----|
| Public Pages | 5 | 3 | -2 (login, signup) |
| Signup Flow | 4 steps | 2 steps | -2 (combined) |
| Dashboard Routes | 10 | 10 | 0 (different prefix) |
| Total Features | ~50 | ~42 | ~8 missing |

**Overall Assessment:** 85% feature complete, but route structure and signup flow need alignment with plan.
