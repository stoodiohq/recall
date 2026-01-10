'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.recall.team';

interface Team {
  id: string;
  name: string;
  tier: string;
  seats: number;
  subscriptionStatus?: string;
  members: Array<{ id: string }>;
}

function BillingSettingsContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [managingBilling, setManagingBilling] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const fetchTeam = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/teams/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setTeam(data.team);
        }
      } catch (error) {
        console.error('Failed to fetch team:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTeam();
    }
  }, [user]);

  const handleManageBilling = async () => {
    const token = getToken();
    if (!token) return;

    setManagingBilling(true);
    try {
      const response = await fetch(`${API_URL}/checkout/portal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    } finally {
      setManagingBilling(false);
    }
  };

  const pricePerSeat = team?.tier === 'enterprise' ? 30 : 12;
  const totalMonthly = (team?.seats || 0) * pricePerSeat;

  if (authLoading || loading) {
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
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/app" className="font-semibold text-xl text-text-primary">recall</a>
            <span className="text-text-tertiary">/</span>
            <a href="/app/settings" className="text-text-secondary hover:text-text-primary">Settings</a>
            <span className="text-text-tertiary">/</span>
            <span className="text-text-secondary">Billing</span>
          </div>
          <a href="/app/settings" className="text-text-tertiary hover:text-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-text-primary mb-8">Billing</h1>

          <div className="space-y-6">
            {/* Current Plan */}
            <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Current Plan</h2>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-text-primary font-medium capitalize">
                    {team?.tier || 'Team'} Plan (Monthly)
                  </p>
                  <p className="text-text-secondary">
                    ${pricePerSeat}/seat/month × {team?.seats || 0} seats = ${totalMonthly}/month
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  team?.subscriptionStatus === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : team?.subscriptionStatus === 'trialing'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {team?.subscriptionStatus === 'trialing' ? 'Trial' : team?.subscriptionStatus || 'Active'}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleManageBilling}
                  disabled={managingBilling}
                  className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                >
                  {managingBilling ? 'Loading...' : 'Manage Subscription'}
                </button>
              </div>
            </div>

            {/* Seats */}
            <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Seats</h2>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-text-primary">{team?.seats || 0} seats included</p>
                  <p className="text-text-tertiary">{team?.members?.length || 0} seats used</p>
                </div>
              </div>
              <button
                onClick={handleManageBilling}
                disabled={managingBilling}
                className="px-4 py-2 border border-border-visible text-text-secondary rounded-lg font-medium hover:border-text-tertiary transition-colors"
              >
                Adjust Seats
              </button>
            </div>

            {/* Payment Method */}
            <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Payment Method</h2>
              <p className="text-text-tertiary mb-4">Manage your payment method through Stripe.</p>
              <button
                onClick={handleManageBilling}
                disabled={managingBilling}
                className="px-4 py-2 border border-border-visible text-text-secondary rounded-lg font-medium hover:border-text-tertiary transition-colors"
              >
                Update Payment Method
              </button>
            </div>

            {/* Billing History */}
            <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Billing History</h2>
              <p className="text-text-tertiary mb-4">View and download past invoices.</p>
              <button
                onClick={handleManageBilling}
                disabled={managingBilling}
                className="px-4 py-2 border border-border-visible text-text-secondary rounded-lg font-medium hover:border-text-tertiary transition-colors"
              >
                View Invoices
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default function BillingSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BillingSettingsContent />
    </Suspense>
  );
}
