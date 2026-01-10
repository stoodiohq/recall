'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.recall.team';

type Step = 'profile' | 'plan' | 'repos' | 'invited-profile';

interface Repo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  updatedAt: string;
  pushedAt: string;
}

const roles = [
  'Software Engineer',
  'Senior Engineer',
  'Staff Engineer',
  'Tech Lead',
  'Engineering Manager',
  'CTO / VP Engineering',
  'Founder',
  'Other',
];

const teamSizes = [
  { value: '1', label: 'Just me' },
  { value: '2-5', label: '2-5 developers' },
  { value: '6-20', label: '6-20 developers' },
  { value: '21-50', label: '21-50 developers' },
  { value: '50+', label: '50+ developers' },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, loginWithCode, refresh } = useAuth();

  const [step, setStep] = useState<Step>('profile');
  const [saving, setSaving] = useState(false);

  // Profile state
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [teamSize, setTeamSize] = useState('');

  // Invited member profile state
  const [displayName, setDisplayName] = useState('');
  const [website, setWebsite] = useState('');
  const [isInvitedMember, setIsInvitedMember] = useState(false);

  // Plan state
  const [selectedPlan, setSelectedPlan] = useState<'team' | 'enterprise'>('team');
  const [seats, setSeats] = useState(5);

  // Repos state
  const [repos, setRepos] = useState<Repo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());
  const [repoSearch, setRepoSearch] = useState('');

  // Handle auth code from URL (after OAuth redirect)
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      loginWithCode(code).then((success) => {
        // Remove code from URL without triggering navigation
        window.history.replaceState({}, '', '/onboarding');
        if (!success) {
          console.error('Failed to exchange auth code');
          // CRITICAL FIX: Redirect to home on auth failure instead of leaving user stranded
          router.push('/');
        }
      });
    }
  }, [searchParams, loginWithCode, router]);

  // Check if user needs onboarding
  useEffect(() => {
    if (!authLoading && !user && !searchParams.get('code')) {
      router.push('/');
      return;
    }

    // Check for pending invite - redirect back to accept it
    if (!authLoading && user) {
      const pendingInvite = sessionStorage.getItem('pendingInvite');
      if (pendingInvite) {
        router.push(`/invite?code=${pendingInvite}`);
        return;
      }

      // If user is already on a team (invited member), show simplified profile
      if (user.team) {
        // If onboarding is already completed, go to dashboard
        if (user.onboardingCompleted) {
          router.push('/app');
          return;
        }
        // Otherwise show simplified profile for invited member
        setIsInvitedMember(true);
        setStep('invited-profile');
        // Pre-fill display name if we have it from GitHub
        if (user.name) {
          setDisplayName(user.name);
        }
      }
    }
  }, [authLoading, user, router, searchParams]);

  // Load repos when we get to that step
  useEffect(() => {
    if (step === 'repos' && repos.length === 0) {
      loadRepos();
    }
  }, [step]);

  const loadRepos = async () => {
    setReposLoading(true);
    const token = getToken();

    try {
      const response = await fetch(`${API_URL}/github/repos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRepos(data.repos || []);
      }
    } catch (error) {
      console.error('Failed to load repos:', error);
    } finally {
      setReposLoading(false);
    }
  };

  const handleProfileSubmit = () => {
    if (!role || !company || !teamSize) return;
    setStep('plan');
  };

  const handleInvitedProfileSubmit = async () => {
    setSaving(true);
    const token = getToken();

    try {
      // Update user profile and mark onboarding complete
      const response = await fetch(`${API_URL}/onboarding/complete-invited`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: displayName || undefined,
          role: role || undefined,
          website: website || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      // Refresh user data
      await refresh();

      // Go to dashboard
      router.push('/app');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePlanSubmit = async () => {
    // For paid plans, go directly to Stripe checkout
    if (selectedPlan === 'team' || selectedPlan === 'enterprise') {
      setSaving(true);
      const token = getToken();

      try {
        const response = await fetch(`${API_URL}/onboarding/complete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role,
            company,
            teamSize,
            teamName: company,
            plan: selectedPlan,
            seats,
            selectedRepos: [], // Repos will be selected after payment
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create checkout session');
        }

        const data = await response.json();

        if (data.requiresPayment && data.checkoutUrl) {
          console.log('[Onboarding] Redirecting to Stripe checkout...');
          window.location.href = data.checkoutUrl;
          return;
        }
      } catch (error) {
        console.error('Failed to create checkout session:', error);
      } finally {
        setSaving(false);
      }
    }

    // For free plan, continue to repo selection
    setStep('repos');
  };

  const handleRepoToggle = (repoId: number) => {
    setSelectedRepos(prev => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  };

  const [initProgress, setInitProgress] = useState<{ current: number; total: number } | null>(null);

  const handleComplete = async () => {
    if (selectedRepos.size === 0) return;

    setSaving(true);
    const token = getToken();

    // Get full repo objects for selected IDs
    const selectedRepoObjects = repos
      .filter(repo => selectedRepos.has(repo.id))
      .map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        private: repo.private,
        description: repo.description,
        language: repo.language,
      }));

    try {
      // Save profile, create team, and enable repos
      const response = await fetch(`${API_URL}/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          company,
          teamSize,
          teamName: company,
          plan: selectedPlan,
          seats,
          selectedRepos: selectedRepoObjects,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      const data = await response.json();

      // For paid plans, redirect to Stripe checkout
      if (data.requiresPayment && data.checkoutUrl) {
        console.log('[Onboarding] Redirecting to Stripe checkout...');
        window.location.href = data.checkoutUrl;
        return;
      }

      // For free plan, initialize repos and go to dashboard
      const enabledRepos = data.enabledRepos || [];

      // Auto-initialize each repo
      console.log('[Onboarding] enabledRepos from API:', enabledRepos);
      if (enabledRepos.length > 0) {
        setInitProgress({ current: 0, total: enabledRepos.length });

        for (let i = 0; i < enabledRepos.length; i++) {
          const repo = enabledRepos[i];
          setInitProgress({ current: i + 1, total: enabledRepos.length });
          console.log(`[Onboarding] Initializing repo ${repo.id} (${repo.fullName})...`);

          try {
            const initResponse = await fetch(`${API_URL}/repos/${repo.id}/initialize`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            const initResult = await initResponse.json();
            console.log(`[Onboarding] Initialize ${repo.fullName} result:`, initResponse.status, initResult);
            if (!initResponse.ok) {
              console.error(`[Onboarding] Failed to initialize ${repo.fullName}:`, initResult);
            }
          } catch (err) {
            console.error(`[Onboarding] Failed to initialize ${repo.fullName}:`, err);
            // Continue with other repos even if one fails
          }
        }
      } else {
        console.log('[Onboarding] No repos to initialize');
      }

      // Refresh user data to include the new team
      await refresh();

      // Redirect to dashboard with refresh param to ensure repos load
      router.push('/app?refresh=1');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setSaving(false);
      setInitProgress(null);
    }
  };

  const filteredRepos = repos.filter(repo =>
    repo.fullName.toLowerCase().includes(repoSearch.toLowerCase()) ||
    (repo.description?.toLowerCase().includes(repoSearch.toLowerCase()))
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-bg-elevated z-50">
        <motion.div
          className="h-full bg-cyan-500"
          initial={{ width: '0%' }}
          animate={{
            width: step === 'invited-profile' ? '100%' : step === 'profile' ? '33%' : step === 'plan' ? '66%' : '100%'
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16">
        <AnimatePresence mode="wait">
          {/* Step 1: Profile */}
          {step === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-4 mb-8">
                {user.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || user.githubUsername}
                    className="w-16 h-16 rounded-full border-2 border-border-subtle"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">
                    Almost there, {user.name?.split(' ')[0] || user.githubUsername}!
                  </h1>
                  <p className="text-text-secondary">Tell us a bit about yourself</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    What&apos;s your role?
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="">Select your role</option>
                    {roles.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Company or team name
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    How big is your dev team?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {teamSizes.map(size => (
                      <button
                        key={size.value}
                        onClick={() => setTeamSize(size.value)}
                        className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                          teamSize === size.value
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                            : 'border-border-subtle text-text-secondary hover:border-text-tertiary'
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleProfileSubmit}
                  disabled={!role || !company || !teamSize}
                  className="w-full bg-text-primary text-bg-base py-4 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-[-1px] hover:shadow-lg transition-all"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* Invited Member Profile (simplified) */}
          {step === 'invited-profile' && (
            <motion.div
              key="invited-profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-4 mb-8">
                {user.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || user.githubUsername}
                    className="w-16 h-16 rounded-full border-2 border-border-subtle"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">
                    Welcome to {user.team?.name || 'the team'}!
                  </h1>
                  <p className="text-text-secondary">Complete your profile (all fields optional)</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Display name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={user.name || user.githubUsername}
                    className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Your role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="">Select your role</option>
                    {roles.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Website or portfolio
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yoursite.com"
                    className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <button
                  onClick={handleInvitedProfileSubmit}
                  disabled={saving}
                  className="w-full bg-text-primary text-bg-base py-4 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-[-1px] hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-bg-base border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Get Started'
                  )}
                </button>

                <p className="text-center text-text-tertiary text-sm">
                  You can update these later in your profile settings.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 2: Plan Selection */}
          {step === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-text-primary mb-2">
                  Choose your plan
                </h1>
                <p className="text-text-secondary">
                  14-day free trial. Cancel anytime.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {/* Team Plan */}
                <button
                  onClick={() => setSelectedPlan('team')}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    selectedPlan === 'team'
                      ? 'border-cyan-500 bg-cyan-500/5'
                      : 'border-border-subtle hover:border-text-tertiary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary">Team</h3>
                    {selectedPlan === 'team' && (
                      <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-text-primary">$12</span>
                    <span className="text-text-tertiary">/seat/month</span>
                  </div>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Unlimited repos
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Unlimited sessions
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      AI-powered summaries
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Encrypted sharing
                    </li>
                  </ul>
                </button>

                {/* Enterprise Plan */}
                <button
                  onClick={() => setSelectedPlan('enterprise')}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    selectedPlan === 'enterprise'
                      ? 'border-purple-500 bg-purple-500/5'
                      : 'border-border-subtle hover:border-text-tertiary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary">Enterprise</h3>
                    {selectedPlan === 'enterprise' && (
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-text-primary">$30</span>
                    <span className="text-text-tertiary">/seat/month</span>
                  </div>
                  <ul className="space-y-2 text-sm text-text-secondary">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Everything in Team
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Bring Your Own LLM Key
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Code never touches our servers
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      SSO / SAML
                    </li>
                  </ul>
                </button>
              </div>

              {/* Seat selector */}
              <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 mb-8">
                <label className="block text-sm font-medium text-text-secondary mb-4">
                  How many seats do you need?
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSeats(Math.max(1, seats - 1))}
                    className="w-10 h-10 rounded-lg border border-border-subtle text-text-primary hover:bg-bg-base transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={seats}
                    onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center bg-transparent text-2xl font-bold text-text-primary focus:outline-none"
                  />
                  <button
                    onClick={() => setSeats(seats + 1)}
                    className="w-10 h-10 rounded-lg border border-border-subtle text-text-primary hover:bg-bg-base transition-colors"
                  >
                    +
                  </button>
                  <div className="ml-auto text-right">
                    <div className="text-2xl font-bold text-text-primary">
                      ${selectedPlan === 'team' ? seats * 12 : seats * 30}/mo
                    </div>
                    <div className="text-sm text-text-tertiary">
                      after 14-day trial
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('profile')}
                  className="px-6 py-4 rounded-lg border border-border-subtle text-text-secondary hover:text-text-primary transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handlePlanSubmit}
                  disabled={saving}
                  className="flex-1 bg-text-primary text-bg-base py-4 rounded-lg font-semibold text-lg hover:translate-y-[-1px] hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-bg-base border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Continue to Payment'
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Repo Selection */}
          {step === 'repos' && (
            <motion.div
              key="repos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-text-primary mb-2">
                  Select your repositories
                </h1>
                <p className="text-text-secondary">
                  Choose which repos to enable Recall for
                </p>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  placeholder="Search repositories..."
                  className="w-full bg-bg-elevated border border-border-subtle rounded-lg pl-12 pr-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Repo list */}
              <div className="bg-bg-elevated border border-border-subtle rounded-xl overflow-hidden mb-8 max-h-96 overflow-y-auto">
                {reposLoading ? (
                  <div className="p-8 text-center">
                    <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-text-secondary">Loading your repositories...</p>
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <div className="p-8 text-center text-text-secondary">
                    {repoSearch ? 'No repos match your search' : 'No repositories found'}
                  </div>
                ) : (
                  filteredRepos.map((repo, index) => (
                    <button
                      key={repo.id}
                      onClick={() => handleRepoToggle(repo.id)}
                      className={`w-full p-4 flex items-center gap-4 text-left hover:bg-bg-base transition-colors ${
                        index !== 0 ? 'border-t border-border-subtle' : ''
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedRepos.has(repo.id)
                          ? 'border-cyan-500 bg-cyan-500'
                          : 'border-border-visible'
                      }`}>
                        {selectedRepos.has(repo.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-bg-base border border-border-subtle flex items-center justify-center">
                        <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary truncate">{repo.fullName}</span>
                          {repo.private && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-400">Private</span>
                          )}
                          {repo.language && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-cyan-500/20 text-cyan-400">{repo.language}</span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-sm text-text-tertiary truncate">{repo.description}</p>
                        )}
                      </div>
                      <div className="text-sm text-text-tertiary flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                        {repo.stars}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('plan')}
                  className="px-6 py-4 rounded-lg border border-border-subtle text-text-secondary hover:text-text-primary transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={selectedRepos.size === 0 || saving}
                  className="flex-1 bg-text-primary text-bg-base py-4 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-[-1px] hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-bg-base border-t-transparent rounded-full animate-spin" />
                      {initProgress
                        ? `Initializing repo ${initProgress.current}/${initProgress.total}...`
                        : 'Setting up...'}
                    </>
                  ) : (
                    <>
                      Connect {selectedRepos.size} Repo{selectedRepos.size !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
