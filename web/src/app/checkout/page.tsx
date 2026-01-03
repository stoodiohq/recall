'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getToken, getGitHubAuthUrl } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://recall-api.stoodiohq.workers.dev';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    seats: 5,
    features: ['Up to 5 developers', 'Full context capture', 'AI-powered summaries', 'Team sync via git'],
  },
  {
    id: 'team',
    name: 'Team',
    price: 149,
    seats: 20,
    features: ['Up to 20 developers', 'Everything in Starter', 'Analytics dashboard', 'Priority support'],
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 399,
    seats: 50,
    features: ['Up to 50 developers', 'Everything in Team', 'SSO integration', 'Dedicated support'],
  },
];

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const planParam = searchParams.get('plan');
  const [selectedPlan, setSelectedPlan] = useState(planParam || 'team');
  const [teamName, setTeamName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (planParam && PLANS.find(p => p.id === planParam)) {
      setSelectedPlan(planParam);
    }
  }, [planParam]);

  const plan = PLANS.find(p => p.id === selectedPlan) || PLANS[1];

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
      const response = await fetch(`${API_URL}/teams`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: teamName.trim(),
          tier: selectedPlan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create team');
      }

      // Success - redirect to dashboard
      router.push('/dashboard?welcome=true');
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

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-text-primary mb-3">Complete your subscription</h1>
          <p className="text-text-secondary">Start building team memory today</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Plan Selection */}
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Select a plan</h2>
            <div className="space-y-3">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedPlan === p.id
                      ? 'border-accent-primary bg-accent-primary/5'
                      : 'border-border-subtle hover:border-border-default'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary">{p.name}</span>
                      {p.popular && (
                        <span className="text-xs bg-accent-primary/20 text-accent-primary px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === p.id ? 'border-accent-primary' : 'border-border-default'
                    }`}>
                      {selectedPlan === p.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-accent-primary" />
                      )}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-text-primary mb-2">
                    ${p.price}<span className="text-sm font-normal text-text-secondary">/month</span>
                  </div>
                  <ul className="text-sm text-text-secondary space-y-1">
                    {p.features.slice(0, 2).map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>

          {/* Checkout Form */}
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-6">Create your team</h2>

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

                {/* Order summary */}
                <div className="bg-bg-base rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-text-secondary">
                    <span>{plan.name} plan</span>
                    <span>${plan.price}/mo</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Seats included</span>
                    <span>{plan.seats}</span>
                  </div>
                  <div className="border-t border-border-subtle pt-3 flex justify-between text-text-primary font-semibold">
                    <span>Total</span>
                    <span>${plan.price}/month</span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-sm text-sm">
                    {error}
                  </div>
                )}

                {/* Mock payment notice */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-sm text-sm">
                  Demo mode: No payment required. Click below to activate your subscription.
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={processing || !teamName.trim()}
                  className="w-full bg-text-primary text-bg-base py-3 rounded-sm font-semibold hover:translate-y-[-1px] hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-bg-base border-t-transparent rounded-full animate-spin" />
                      Creating team...
                    </span>
                  ) : (
                    `Start ${plan.name} Plan`
                  )}
                </button>

                <p className="text-center text-text-tertiary text-xs">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            )}
          </div>
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
