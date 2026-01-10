'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.recall.team';

const industries = [
  'SaaS / Software',
  'FinTech',
  'HealthTech',
  'E-commerce',
  'Agency / Consulting',
  'Gaming',
  'EdTech',
  'Media / Entertainment',
  'Enterprise',
  'Other',
];

function TeamSetupContent() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signup/connect');
    }
  }, [authLoading, user, router]);

  const handleCreate = async () => {
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }

    setError(null);
    setCreating(true);

    try {
      const token = getToken();
      if (!token) {
        router.push('/signup/connect');
        return;
      }

      // Get plan data
      const planData = JSON.parse(localStorage.getItem('signup_plan') || '{}');

      const response = await fetch(`${API_URL}/teams`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: companyName.trim(),
          website: website.trim() || undefined,
          industry: industry || undefined,
          tier: planData.plan || 'team',
          seats: planData.seats || 3,
          billingCycle: planData.billing || 'monthly',
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create team');
      }

      // Clear signup data
      localStorage.removeItem('signup_plan');
      localStorage.removeItem('signup_payment');
      localStorage.removeItem('signup_flow');

      // Refresh auth context
      await refresh();

      // Go to dashboard
      router.push('/app');
    } catch (err) {
      console.error('Failed to create team:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
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
          <a href="/" className="font-semibold text-xl text-text-primary">recall</a>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-12">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="w-12 h-0.5 bg-green-500" />
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="w-12 h-0.5 bg-green-500" />
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="w-12 h-0.5 bg-cyan-500" />
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white text-sm font-bold">4</div>
          </div>

          <h1 className="text-3xl font-bold text-text-primary text-center mb-2">Create your team</h1>
          <p className="text-text-secondary text-center mb-12">Almost done! Tell us about your company.</p>

          {/* Logged in as */}
          <div className="bg-bg-elevated border border-border-subtle rounded-xl p-4 mb-8 flex items-center gap-4">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name || user.githubUsername || 'User'}
                className="w-12 h-12 rounded-full border border-border-subtle"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-bg-base border border-border-subtle flex items-center justify-center">
                <span className="text-text-tertiary text-lg">
                  {(user?.name || user?.githubUsername || '?')[0].toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="text-text-primary font-medium">{user?.name || user?.githubUsername}</p>
              <p className="text-text-tertiary text-sm">{user?.email}</p>
            </div>
            <span className="ml-auto px-2 py-1 text-xs rounded bg-green-500/20 text-green-400">Connected</span>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Company name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Inc"
                className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Company website <span className="text-text-tertiary">(optional)</span>
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://acme.com"
                className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Industry <span className="text-text-tertiary">(optional)</span>
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-cyan-500 transition-colors appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 1rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5rem',
                }}
              >
                <option value="">Select industry</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating || !companyName.trim()}
            className="w-full mt-8 py-4 bg-text-primary text-bg-base rounded-lg font-semibold hover:translate-y-[-1px] hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {creating ? 'Creating team...' : 'Create team'}
          </button>

          <p className="text-center text-text-tertiary text-sm mt-6">
            You'll be the team owner. You can invite teammates from the dashboard.
          </p>
        </motion.div>
      </main>
    </div>
  );
}

export default function TeamSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TeamSetupContent />
    </Suspense>
  );
}
