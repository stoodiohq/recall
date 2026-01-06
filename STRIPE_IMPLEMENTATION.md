# Stripe Implementation Plan

**Created:** 2026-01-05  
**Status:** Code Complete - Manual Setup Required  
**Pricing Model:** $12/user/month (per-seat)

---

## ✅ Completed

### 1. Stripe Account Setup
- [x] Stripe account exists (Stoodio)
- [x] Selected "Prebuilt checkout form" integration type
- [x] Created test product in Stripe Dashboard

### 2. Product Configuration
| Field | Value |
|-------|-------|
| **Product Name** | Recall Team Standard |
| **Pricing Model** | Standard pricing |
| **Price** | $12.00 USD |
| **Billing Period** | Monthly (Recurring) |
| **Mode** | Test mode |

### 3. Stripe IDs (TEST MODE)
```
Product ID: prod_TjwA4wUcSPrNlb
Price ID:   price_1SmSHwGXjDBivCg0OI443n2Y
```

### 4. Code Changes (DONE ✅)

#### Backend API (cloud/src/index.ts)
- [x] Added Stripe keys to Env interface
- [x] Added Stripe fields to Team interface
- [x] Created `POST /checkout/create-session` endpoint
- [x] Created `POST /webhooks/stripe` endpoint
- [x] Created `POST /checkout/portal` endpoint (for managing subscriptions)

#### Frontend (web/src/app/checkout/page.tsx)
- [x] Removed old tier selection (Starter/Team/Business)
- [x] Added seat quantity picker (1-100 seats)
- [x] Shows dynamic pricing: seats × $12 = total
- [x] Redirects to Stripe Checkout on submit
- [x] Handles checkout canceled state

#### Database Migration (cloud/migrations/0010_stripe_fields.sql)
- [x] Added `stripe_customer_id` column
- [x] Added `stripe_subscription_id` column
- [x] Added `subscription_status` column

#### Configuration (cloud/wrangler.toml)
- [x] Added `STRIPE_PRICE_ID` environment variable

---

## 🔲 Manual Steps Required

### Step 1: Add Stripe Secret Key (5 min)

Run these commands in your terminal:

```bash
cd /Users/concordsteve/Projects/Stoodio/recall/cloud

# Add the Stripe secret key
npx wrangler secret put STRIPE_SECRET_KEY
# When prompted, paste your sk_test_... key from Stripe Dashboard
```

### Step 2: Run Database Migration (2 min)

```bash
cd /Users/concordsteve/Projects/Stoodio/recall/cloud

# Run the migration
npx wrangler d1 execute recall-db --file=migrations/0010_stripe_fields.sql
```

### Step 3: Create Stripe Webhook (5 min)

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"**
3. Enter endpoint URL: `https://recall-api.stoodiohq.workers.dev/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`  
   - `customer.subscription.deleted`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Add it to Cloudflare:
   ```bash
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   # Paste the whsec_... key when prompted
   ```

### Step 4: Deploy API Changes (2 min)

```bash
cd /Users/concordsteve/Projects/Stoodio/recall/cloud

# Deploy the updated API
npx wrangler deploy
```

### Step 5: Test the Flow (5 min)

1. Go to https://recall.team/checkout (or localhost:3003/checkout)
2. Sign in with GitHub
3. Enter a team name
4. Select number of seats (e.g., 5)
5. Click "Subscribe - $60/month"
6. Complete Stripe Checkout with test card: `4242 4242 4242 4242`
7. Verify redirect to dashboard with team created

---

### Phase 3: Frontend Changes (Web/Next.js)

#### 3.1 Update Checkout Page
**File:** `/web/src/app/checkout/page.tsx`

Changes:
- Remove tier selection (Starter/Team/Business)
- Add seat quantity picker (1-100)
- Show price calculation: `seats × $12 = total/month`
- Update submit to call `/checkout/create-session`
- Redirect to Stripe Checkout URL

#### 3.2 Update Pricing Display
**File:** `/web/src/components/Pricing.tsx`

Changes:
- Simplify to single "$12/user/month" pricing
- Remove tier cards (Starter/Team/Business)
- Add CTA that goes to checkout with default seats

#### 3.3 Handle Success/Cancel
- Success: `?success=true` shows welcome message
- Cancel: `?canceled=true` shows "checkout canceled" message

---

### Phase 4: Database Updates

#### 4.1 Add Stripe Fields to Teams Table
```sql
ALTER TABLE teams ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE teams ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE teams ADD COLUMN subscription_status TEXT DEFAULT 'active';
```

#### 4.2 Migration File
Create: `/cloud/migrations/XXXX_add_stripe_fields.sql`

---

### Phase 5: Testing

#### 5.1 Test Card Numbers
| Card | Use |
|------|-----|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Decline |
| `4000 0000 0000 3220` | 3D Secure |

#### 5.2 Test Flow
1. Go to checkout page
2. Select 5 seats ($60/month)
3. Click "Subscribe"
4. Complete Stripe Checkout with test card
5. Verify:
   - Redirected to dashboard
   - Team created with 5 seats
   - Subscription active in Stripe

---

### Phase 6: Go Live Checklist

When ready for production:

- [ ] Switch Stripe to Live mode
- [ ] Update `STRIPE_SECRET_KEY` with live key (`sk_live_...`)
- [ ] Update `STRIPE_PRICE_ID` with live price ID
- [ ] Create live webhook endpoint
- [ ] Update `STRIPE_WEBHOOK_SECRET` with live signing secret
- [ ] Test with real card
- [ ] Remove "Demo mode" notices from UI

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Flow                                │
└─────────────────────────────────────────────────────────────────┘

1. User visits /checkout
   ↓
2. Selects number of seats (e.g., 5)
   ↓
3. Clicks "Subscribe" → API call to /checkout/create-session
   ↓
4. API creates Stripe Checkout Session
   ↓
5. User redirected to Stripe Checkout (stripe.com)
   ↓
6. User enters payment info, submits
   ↓
7. Stripe sends webhook to /webhooks/stripe
   ↓
8. API creates team + subscription in database
   ↓
9. User redirected to /dashboard?success=true
   ↓
10. Dashboard shows new team!
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `/cloud/wrangler.toml` | Add STRIPE_PRICE_ID |
| `/cloud/src/index.ts` | Add Env types, checkout endpoint, webhook endpoint |
| `/cloud/migrations/XXXX_add_stripe_fields.sql` | New migration |
| `/web/src/app/checkout/page.tsx` | Seat picker, Stripe redirect |
| `/web/src/components/Pricing.tsx` | Simplify to per-seat pricing |

---

## Quick Reference

### Stripe Dashboard Links (Test Mode)
- [API Keys](https://dashboard.stripe.com/test/apikeys)
- [Products](https://dashboard.stripe.com/test/products)
- [Webhooks](https://dashboard.stripe.com/test/webhooks)
- [Customers](https://dashboard.stripe.com/test/customers)
- [Subscriptions](https://dashboard.stripe.com/test/subscriptions)

### Cloudflare Commands
```bash
# Add secrets
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET

# Deploy
wrangler deploy

# View logs
wrangler tail
```

---

## Next Action

**Get and provide your Stripe Secret Key:**
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy the Secret key (`sk_test_...`)
3. Share it so we can continue implementation

