'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getToken, getGitHubAuthUrl } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.recall.team';

const PRICE_PER_SEAT = 12;
const MIN_SEATS = 1;
const MAX_SEATS = 100;

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [seats, setSeats] = useState(5);
  const [teamName, setTeamName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle canceled checkout
  const canceled = searchParams.get('canceled');
  useEffect(() => {
    if (canceled === 'true') {
      setError('Checkout was canceled. You can try again when ready.');
    }
  }, [canceled]);

  const handleSeatsChange = (value: number) => {
    const clampedValue = Math.max(MIN_SEATS, Math.min(MAX_SEATS, value));
    setSeats(clampedValue);
  };

  const handleCheckout = async () => {
    if (!user) {
      window.location.href = getGitHubAuthUrl();
      return;
    }

    if (!teamName.trim()) {
      setError('Please enter a team name');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/checkout/create-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seats,
          teamName: teamName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalPrice = seats * PRICE_PER_SEAT;

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
          <a href="/" className="font-semibold text-xl text-text-primary">
            recall
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-text-primary mb-3">Start your Recall subscription</h1>
          <p className="text-text-secondary">Team memory for AI coding assistants</p>
        </div>

        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-8">
          {!user ? (
            <div className="text-center py-8">
              <p className="text-text-secondary mb-4">Sign in with GitHub to continue</p>
              <a
                href={getGitHubAuthUrl()}
                className="inline-flex items-center gap-2 bg-text-primary text-bg-base px-6 py-3 rounded-sm font-semibold hover:translate-y-[-1px] transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                Continue with GitHub
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {/* User info */}
              <div className="flex items-center gap-3 pb-4 border-b border-border-subtle">
                {user.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || user.githubUsername}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="text-text-primary font-medium">{user.name || user.githubUsername}</p>
                  <p className="text-text-secondary text-sm">{user.email}</p>
                </div>
              </div>

              {/* Pricing display */}
              <div className="text-center py-4 bg-gradient-to-r from-accent-primary/10 to-purple-500/10 rounded-lg">
                <div className="text-4xl font-bold text-text-primary mb-1">
                  ${PRICE_PER_SEAT}<span className="text-lg font-normal text-text-secondary">/user/month</span>
                </div>
                <p className="text-text-secondary text-sm">Per-seat pricing. Add or remove seats anytime.</p>
              </div>

              {/* Team name input */}
              <div>
                <label htmlFor="teamName" className="block text-sm font-medium text-text-primary mb-2">
                  Team name
                </label>
                <input
                  type="text"
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Acme Engineering"
                  className="w-full px-4 py-3 bg-bg-base border border-border-subtle rounded-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                />
              </div>

              {/* Seat selector */}
              <div>
                <label htmlFor="seats" className="block text-sm font-medium text-text-primary mb-2">
                  Number of seats
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleSeatsChange(seats - 1)}
                    disabled={seats <= MIN_SEATS}
                    className="w-10 h-10 rounded-sm border border-border-subtle flex items-center justify-center text-text-primary hover:bg-bg-base disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    id="seats"
                    value={seats}
                    onChange={(e) => handleSeatsChange(parseInt(e.target.value) || 1)}
                    min={MIN_SEATS}
                    max={MAX_SEATS}
                    className="w-24 px-4 py-3 bg-bg-base border border-border-subtle rounded-sm text-text-primary text-center focus:outline-none focus:border-accent-primary transition-colors"
                  />
                  <button
                    onClick={() => handleSeatsChange(seats + 1)}
                    disabled={seats >= MAX_SEATS}
                    className="w-10 h-10 rounded-sm border border-border-subtle flex items-center justify-center text-text-primary hover:bg-bg-base disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                <p className="text-text-tertiary text-sm mt-2">You can add more seats later from your dashboard.</p>
              </div>

              {/* Order summary */}
              <div className="bg-bg-base rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-text-secondary">
                  <span>{seats} seat{seats !== 1 ? 's' : ''} × ${PRICE_PER_SEAT}/mo</span>
                  <span>${totalPrice}/mo</span>
                </div>
                <div className="border-t border-border-subtle pt-3 flex justify-between text-text-primary font-semibold text-lg">
                  <span>Total</span>
                  <span>${totalPrice}/month</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-sm text-sm">
                  {error}
                </div>
              )}

              {/* Features list */}
              <div className="border-t border-border-subtle pt-4">
                <p className="text-sm font-medium text-text-primary mb-3">What&apos;s included:</p>
                <ul className="grid grid-cols-2 gap-2 text-sm text-text-secondary">
                  {[
                    'Full context capture',
                    'AI-powered summaries',
                    'Team sync via git',
                    'Encrypted storage',
                    'MCP integration',
                    'Add/remove seats anytime',
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleCheckout}
                disabled={processing || !teamName.trim()}
                className="w-full bg-text-primary text-bg-base py-3 rounded-sm font-semibold hover:translate-y-[-1px] hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-bg-base border-t-transparent rounded-full animate-spin" />
                    Redirecting to checkout...
                  </span>
                ) : (
                  `Subscribe - $${totalPrice}/month`
                )}
              </button>

              <p className="text-center text-text-tertiary text-xs">
                Secure payment powered by Stripe. Cancel anytime.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-base flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
