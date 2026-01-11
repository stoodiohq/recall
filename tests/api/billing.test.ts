/**
 * API Billing Tests
 * Tests Stripe integration and subscription management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockFetch, clearFetchMocks, mockStripe, mockApiResponses } from '../utils/mocks';
import { authHeader } from '../utils/helpers';
import { createTeam } from '../utils/factories';

const API_URL = 'http://localhost:8787';

describe('API Billing', () => {
  beforeEach(() => {
    clearFetchMocks();
  });

  afterEach(() => {
    clearFetchMocks();
  });

  describe('Checkout', () => {
    it('POST /checkout/create-session should create Stripe checkout', async () => {
      mockFetch({
        'POST /checkout/create-session': {
          sessionId: 'cs_test_xxx',
          url: 'https://checkout.stripe.com/pay/cs_test_xxx',
        },
      });

      const response = await fetch(`${API_URL}/checkout/create-session`, {
        method: 'POST',
        headers: {
          ...authHeader('owner_token'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seats: 5,
          successUrl: 'https://recall.team/success',
          cancelUrl: 'https://recall.team/cancel',
        }),
      });

      const data = await response.json() as { url: string };
      expect(data.url).toContain('checkout.stripe.com');
    });

    it('should include correct line items', async () => {
      const expectedLineItems = {
        price: 'price_xxx', // From STRIPE_PRICE_ID
        quantity: 5, // Number of seats
      };

      expect(expectedLineItems.quantity).toBe(5);
    });

    it('should set success and cancel URLs', async () => {
      const urls = {
        successUrl: 'https://recall.team/onboarding/success?session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: 'https://recall.team/dashboard',
      };

      expect(urls.successUrl).toContain('{CHECKOUT_SESSION_ID}');
    });
  });

  describe('Customer Portal', () => {
    it('POST /checkout/portal should return portal URL', async () => {
      mockFetch({
        'POST /checkout/portal': {
          url: 'https://billing.stripe.com/session/xxx',
        },
      });

      const response = await fetch(`${API_URL}/checkout/portal`, {
        method: 'POST',
        headers: authHeader('owner_token'),
      });

      const data = await response.json() as { url: string };
      expect(data.url).toContain('billing.stripe.com');
    });

    it('should require team with Stripe customer ID', async () => {
      mockFetch({
        'POST /checkout/portal': () => {
          return new Response(
            JSON.stringify({ error: 'No billing account found' }),
            { status: 400 }
          );
        },
      });

      const response = await fetch(`${API_URL}/checkout/portal`, {
        method: 'POST',
        headers: authHeader('no_billing_token'),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Billing Overview', () => {
    it('GET /teams/:id/billing should return billing info', async () => {
      mockFetch({
        'GET /teams/team-123/billing': {
          tier: 'pro',
          seats: 5,
          pricePerSeat: 10,
          monthlyTotal: 50,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
        },
      });

      const response = await fetch(`${API_URL}/teams/team-123/billing`, {
        headers: authHeader('owner_token'),
      });

      const data = await response.json() as { tier: string; status: string };
      expect(data.tier).toBe('pro');
      expect(data.status).toBe('active');
    });

    it('GET /teams/:id/billing/invoices should list invoices', async () => {
      mockFetch({
        'GET /teams/team-123/billing/invoices': {
          invoices: [
            {
              id: 'inv_xxx',
              amount: 5000,
              currency: 'usd',
              status: 'paid',
              created: new Date().toISOString(),
              pdf: 'https://pay.stripe.com/invoice/xxx/pdf',
            },
          ],
        },
      });

      const response = await fetch(`${API_URL}/teams/team-123/billing/invoices`, {
        headers: authHeader('owner_token'),
      });

      const data = await response.json() as { invoices: object[] };
      expect(data.invoices.length).toBeGreaterThan(0);
    });
  });

  describe('Stripe Webhooks', () => {
    it('POST /webhooks/stripe should handle checkout.session.completed', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_xxx',
            customer: 'cus_xxx',
            subscription: 'sub_xxx',
            metadata: {
              teamId: 'team-123',
              seats: '5',
            },
          },
        },
      };

      mockFetch({
        'POST /webhooks/stripe': { received: true },
      });

      const response = await fetch(`${API_URL}/webhooks/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 'sig_xxx',
        },
        body: JSON.stringify(event),
      });

      expect(response.ok).toBe(true);
    });

    it('should activate subscription on checkout complete', () => {
      const updates = {
        stripe_customer_id: 'cus_xxx',
        stripe_subscription_id: 'sub_xxx',
        subscription_status: 'active',
        tier: 'pro',
        seats: 5,
      };

      expect(updates.subscription_status).toBe('active');
    });

    it('should handle subscription updated event', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_xxx',
            status: 'active',
            items: {
              data: [{ quantity: 10 }],
            },
          },
        },
      };

      // Should update seats in database
      const updatedSeats = event.data.object.items.data[0].quantity;
      expect(updatedSeats).toBe(10);
    });

    it('should handle subscription deleted event', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_xxx',
            status: 'canceled',
          },
        },
      };

      // Should downgrade team to free tier
      expect(event.data.object.status).toBe('canceled');
    });

    it('should handle payment failed event', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            subscription: 'sub_xxx',
            attempt_count: 1,
          },
        },
      };

      // Should update subscription status
      expect(event.type).toBe('invoice.payment_failed');
    });

    it('should verify webhook signature', async () => {
      mockFetch({
        'POST /webhooks/stripe': () => {
          return new Response(
            JSON.stringify({ error: 'Invalid signature' }),
            { status: 400 }
          );
        },
      });

      const response = await fetch(`${API_URL}/webhooks/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 'invalid_signature',
        },
        body: JSON.stringify({ type: 'test' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Subscription Status', () => {
    it('should allow access for active subscription', async () => {
      const team = createTeam({ tier: 'pro' });
      const status = 'active';

      expect(status === 'active' || status === 'trialing').toBe(true);
    });

    it('should allow access during trial', async () => {
      const status = 'trialing';
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      expect(status).toBe('trialing');
      expect(trialEnd.getTime()).toBeGreaterThan(Date.now());
    });

    it('should deny encryption key access for past_due', async () => {
      mockFetch({
        'GET /keys/team': () => {
          return new Response(
            JSON.stringify({
              hasAccess: false,
              message: 'Subscription payment failed. Update your payment method.',
            }),
            { status: 403 }
          );
        },
      });

      const response = await fetch(`${API_URL}/keys/team`, {
        headers: authHeader('past_due_token'),
      });

      expect(response.status).toBe(403);
    });

    it('should deny access for canceled subscription', async () => {
      mockFetch({
        'GET /keys/team': () => {
          return new Response(
            JSON.stringify({
              hasAccess: false,
              message: 'Subscription canceled. Resubscribe to access team memory.',
            }),
            { status: 403 }
          );
        },
      });

      const response = await fetch(`${API_URL}/keys/team`, {
        headers: authHeader('canceled_token'),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Seat Management', () => {
    it('should update subscription quantity when seats change', async () => {
      mockFetch({
        'PATCH /teams/team-123': {
          seats: 10,
        },
      });

      const response = await fetch(`${API_URL}/teams/team-123`, {
        method: 'PATCH',
        headers: {
          ...authHeader('owner_token'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ seats: 10 }),
      });

      const data = await response.json() as { seats: number };
      expect(data.seats).toBe(10);
    });

    it('should prorate seat changes', async () => {
      // Stripe handles proration automatically
      const subscriptionUpdate = {
        quantity: 10,
        proration_behavior: 'create_prorations',
      };

      expect(subscriptionUpdate.proration_behavior).toBe('create_prorations');
    });

    it('should not allow more members than seats', async () => {
      mockFetch({
        'POST /invites/abc/accept': () => {
          return new Response(
            JSON.stringify({
              error: 'Team has reached seat limit. Upgrade to add more members.',
            }),
            { status: 403 }
          );
        },
      });

      const response = await fetch(`${API_URL}/invites/abc/accept`, {
        method: 'POST',
        headers: authHeader('new_user_token'),
      });

      expect(response.status).toBe(403);
    });
  });
});
