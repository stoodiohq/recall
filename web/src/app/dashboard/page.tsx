'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://recall-api.stoodiohq.workers.dev';

interface LicenseStatus {
  valid: boolean;
  tier: string | null;
  seats: number;
  seatsUsed: number;
  features: string[];
  message?: string;
}

interface EnabledRepo {
  id: string;
  githubRepoId: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  language: string | null;
  enabled: boolean;
  enabledAt: string;
  lastSyncAt: string | null;
  initializedAt: string | null;
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Step action components
function SubscriptionStep({ license, licenseLoading }: { license: LicenseStatus | null; licenseLoading: boolean }) {
  if (licenseLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (license?.valid && license.tier) {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-green-400 font-medium">Subscription Active</p>
          <p className="text-text-secondary text-sm">{license.tier.charAt(0).toUpperCase() + license.tier.slice(1)} plan - {license.seatsUsed}/{license.seats} seats used</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-text-secondary">You need an active subscription to use Recall with your team.</p>
      <a
        href="/#pricing"
        className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
      >
        View Plans
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </div>
  );
}

function ReposStep({
  repos,
  reposLoading,
  initializingRepos,
  onInitialize,
  onDisconnect
}: {
  repos: EnabledRepo[];
  reposLoading: boolean;
  initializingRepos: Set<string>;
  onInitialize: (id: string) => void;
  onDisconnect: (id: string) => void;
}) {
  if (reposLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-text-secondary">Connect your GitHub repositories so Recall can build team memory from your codebase.</p>
        <a
          href="/dashboard/repos"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Connect Repositories
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-green-400 font-medium">{repos.length} {repos.length === 1 ? 'repository' : 'repositories'} connected</p>
        <a href="/dashboard/repos" className="text-sm text-cyan-400 hover:underline">Manage repos</a>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {repos.map((repo) => (
          <div key={repo.id} className="flex items-center justify-between p-3 bg-bg-base border border-border-subtle rounded-lg">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-text-primary text-sm">{repo.fullName}</span>
              {repo.private && (
                <svg className="w-3 h-3 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </div>
            <div className="flex items-center gap-2">
              {repo.initializedAt ? (
                <span className="flex items-center gap-1.5 text-xs text-green-400">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Active
                </span>
              ) : initializingRepos.has(repo.id) ? (
                <span className="flex items-center gap-1.5 text-xs text-cyan-400">
                  <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  Initializing
                </span>
              ) : (
                <button onClick={() => onInitialize(repo.id)} className="text-xs text-yellow-400 hover:text-yellow-300">
                  Initialize
                </button>
              )}
              <button onClick={() => onDisconnect(repo.id)} className="text-text-tertiary hover:text-red-400 p-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InitializeStep({
  repos,
  initializingRepos,
  onInitialize
}: {
  repos: EnabledRepo[];
  initializingRepos: Set<string>;
  onInitialize: (id: string) => void;
}) {
  const uninitializedRepos = repos.filter(r => !r.initializedAt);
  const initializedRepos = repos.filter(r => r.initializedAt);

  if (repos.length === 0) {
    return (
      <div className="p-4 bg-bg-base border border-border-subtle rounded-lg">
        <p className="text-text-tertiary text-sm">Connect repositories first to initialize memory.</p>
      </div>
    );
  }

  if (uninitializedRepos.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-green-400 font-medium">Memory Initialized</p>
          <p className="text-text-secondary text-sm">{initializedRepos.length} {initializedRepos.length === 1 ? 'repository' : 'repositories'} ready</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-text-secondary">Initialize memory for your repositories. This scans your codebase to build context for your AI tools.</p>
      <div className="space-y-2">
        {uninitializedRepos.map((repo) => (
          <div key={repo.id} className="flex items-center justify-between p-3 bg-bg-base border border-yellow-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full" />
              <span className="text-text-primary text-sm">{repo.fullName}</span>
            </div>
            {initializingRepos.has(repo.id) ? (
              <span className="flex items-center gap-2 text-sm text-cyan-400">
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                Initializing...
              </span>
            ) : (
              <button
                onClick={() => onInitialize(repo.id)}
                className="bg-yellow-500/20 text-yellow-400 px-4 py-1.5 rounded text-sm font-medium hover:bg-yellow-500/30 transition-colors"
              >
                Initialize
              </button>
            )}
          </div>
        ))}
      </div>
      {initializedRepos.length > 0 && (
        <p className="text-text-tertiary text-sm">{initializedRepos.length} already initialized</p>
      )}
    </div>
  );
}

function IntegrateStep({
  hasMcpConnection,
  lastMcpConnection
}: {
  hasMcpConnection: boolean;
  lastMcpConnection: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(true);

  // Auto-generate token on mount
  useEffect(() => {
    const generateToken = async () => {
      try {
        const token = getToken();
        const response = await fetch(`${API_URL}/auth/token`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'MCP Token' }),
        });
        if (response.ok) {
          const data = await response.json();
          setApiToken(data.token);
        }
      } catch (err) {
        console.error('Failed to generate token:', err);
      } finally {
        setGeneratingToken(false);
      }
    };
    generateToken();
  }, []);

  const installCommand = apiToken ? `npx recall-mcp-server install ${apiToken}` : '';

  const handleCopy = () => {
    if (!installCommand) return;
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (hasMcpConnection) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-green-400 font-medium flex items-center gap-2">
              AI Tool Connected
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </p>
            <p className="text-text-secondary text-sm">Last connected {getTimeAgo(lastMcpConnection!)}</p>
          </div>
        </div>
        <p className="text-text-tertiary text-sm">Your AI coding tool has access to team memory. Need to set up another tool?</p>
      </div>
    );
  }

  // Show loading state while token generates
  if (generatingToken) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary">Preparing your install command...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-text-secondary">Run this command in your terminal to install Recall:</p>

      {/* Install Command */}
      <div className="bg-bg-base border border-border-subtle rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <code className="text-cyan-400 font-mono text-sm break-all flex-1 mr-4">
            {installCommand || 'Loading...'}
          </code>
          <button
            onClick={handleCopy}
            disabled={!apiToken}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
              copied
                ? 'bg-green-500/20 text-green-400'
                : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
            } disabled:opacity-50`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* What it does */}
      <div className="flex items-start gap-3 p-3 bg-bg-elevated border border-border-subtle rounded-lg">
        <svg className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-text-secondary">
          <p>This command automatically:</p>
          <ul className="mt-1 space-y-0.5 text-text-tertiary">
            <li>• Detects your AI tool (Claude Code, Cursor, or Windsurf)</li>
            <li>• Adds Recall to your MCP configuration</li>
            <li>• Verifies the connection</li>
          </ul>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-text-secondary text-sm">
          After running, restart your AI tool. This page will update automatically once connected.
        </p>
      </div>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, logout, login, refresh } = useAuth();
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(true);
  const [repos, setRepos] = useState<EnabledRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [showAccountPanel, setShowAccountPanel] = useState(false);

  // Handle token from URL (after OAuth redirect for returning users)
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      login(token).then(() => {
        window.history.replaceState({}, '', '/dashboard');
      });
    }
  }, [searchParams, login]);

  // Handle refresh param (after returning from repos page or onboarding)
  useEffect(() => {
    const refreshParam = searchParams.get('refresh');
    if (refreshParam) {
      // Clear the param from URL immediately
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user && !searchParams.get('token')) {
      router.push('/');
    }
  }, [loading, user, router, searchParams]);

  useEffect(() => {
    const fetchLicense = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/license/check`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          setLicense(await response.json());
        }
      } catch {
        // ignore
      } finally {
        setLicenseLoading(false);
      }
    };

    if (user) fetchLicense();
  }, [user]);

  useEffect(() => {
    const fetchRepos = async () => {
      const token = getToken();
      console.log('[Dashboard] fetchRepos called, token exists:', !!token);
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/repos`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        console.log('[Dashboard] /repos response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('[Dashboard] /repos returned:', data);
          setRepos(data.repos || []);
        }
      } catch (err) {
        console.error('[Dashboard] fetchRepos error:', err);
      } finally {
        setReposLoading(false);
      }
    };

    console.log('[Dashboard] useEffect triggered, user:', !!user);
    if (user) fetchRepos();
  }, [user]);

  // Poll for MCP connection status every 5 seconds while waiting
  useEffect(() => {
    if (!user || user.lastMcpConnection) return;

    // Poll frequently while waiting for first connection
    const interval = setInterval(() => {
      refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [user, refresh]);

  const [initializingRepos, setInitializingRepos] = useState<Set<string>>(new Set());
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const handleCreateInvite = async () => {
    const token = getToken();
    if (!token) return;

    setCreatingInvite(true);
    try {
      const response = await fetch(`${API_URL}/teams/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        setInviteUrl(data.url);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create invite');
      }
    } catch (error) {
      console.error('Failed to create invite:', error);
      alert('Failed to create invite');
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleDisconnectRepo = async (repoId: string) => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/repos/${repoId}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setRepos(repos.filter(r => r.id !== repoId));
      }
    } catch (error) {
      console.error('Failed to disconnect repo:', error);
    }
  };

  const handleInitializeRepo = async (repoId: string) => {
    const token = getToken();
    if (!token) return;

    setInitializingRepos(prev => new Set(prev).add(repoId));

    try {
      const response = await fetch(`${API_URL}/repos/${repoId}/initialize`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setRepos(repos.map(r =>
          r.id === repoId ? { ...r, initializedAt: new Date().toISOString() } : r
        ));
      } else {
        const error = await response.json();
        alert(`Failed to initialize: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to initialize repo:', error);
      alert('Failed to initialize repository. Please try again.');
    } finally {
      setInitializingRepos(prev => {
        const next = new Set(prev);
        next.delete(repoId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Calculate setup progress
  const hasSubscription = license?.valid && license.tier;
  const hasRepos = repos.length > 0;
  const hasInitializedRepos = repos.some(r => r.initializedAt);
  const hasMcpConnection = !!user.lastMcpConnection;

  // Connect = Connect + Initialize combined (auto-init happens during connect)
  const hasConnectedRepos = hasRepos && hasInitializedRepos;

  const setupSteps = [
    {
      id: 'subscription',
      label: 'Active subscription',
      complete: !!hasSubscription,
      description: 'Choose a plan to get started'
    },
    {
      id: 'repos',
      label: 'Connect repositories',
      complete: hasConnectedRepos,
      description: 'Link your GitHub repos'
    },
    {
      id: 'integrate',
      label: 'AI tool connected',
      complete: hasMcpConnection,
      description: 'Configure your AI tool'
    },
  ];

  const completedSteps = setupSteps.filter(s => s.complete).length;
  const setupComplete = completedSteps === setupSteps.length;
  const progressPercent = (completedSteps / setupSteps.length) * 100;

  // Find the current step (first incomplete)
  const currentStepIndex = setupSteps.findIndex(s => !s.complete);
  const currentStep = currentStepIndex >= 0 ? setupSteps[currentStepIndex] : null;

  const tierColors: Record<string, string> = {
    free: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    team: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    enterprise: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    starter: 'bg-green-500/20 text-green-400 border-green-500/30',
    business: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="font-semibold text-xl text-text-primary">recall</a>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAccountPanel(!showAccountPanel)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              {user.avatarUrl && (
                <img src={user.avatarUrl} alt={user.name || user.githubUsername} className="w-8 h-8 rounded-full border border-border-subtle" />
              )}
              <span className="text-text-secondary text-sm hidden sm:block">{user.name || user.githubUsername}</span>
              <svg className={`w-4 h-4 text-text-tertiary transition-transform ${showAccountPanel ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Collapsible Account Panel */}
        {showAccountPanel && (
          <div className="border-t border-border-subtle bg-bg-elevated">
            <div className="max-w-4xl mx-auto px-6 py-4">
              <div className="grid sm:grid-cols-3 gap-4">
                {/* Account Info */}
                <div className="space-y-1">
                  <p className="text-text-tertiary text-xs uppercase tracking-wider">Account</p>
                  <p className="text-text-primary font-medium">{user.email}</p>
                  <p className="text-text-tertiary text-sm">@{user.githubUsername}</p>
                </div>

                {/* Subscription */}
                <div className="space-y-1">
                  <p className="text-text-tertiary text-xs uppercase tracking-wider">Plan</p>
                  {license?.valid && license.tier ? (
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${tierColors[license.tier]}`}>
                        {license.tier.charAt(0).toUpperCase() + license.tier.slice(1)}
                      </span>
                      <span className="text-text-secondary text-sm">{license.seatsUsed}/{license.seats} seats</span>
                    </div>
                  ) : (
                    <a href="/#pricing" className="text-cyan-400 text-sm hover:underline">Get a plan</a>
                  )}
                </div>

                {/* Team */}
                <div className="space-y-1">
                  <p className="text-text-tertiary text-xs uppercase tracking-wider">Team</p>
                  {user.team ? (
                    <div className="flex items-center justify-between">
                      <p className="text-text-primary">{user.team.name}</p>
                      {(user.team.role === 'owner' || user.team.role === 'admin') && (
                        <button onClick={handleCreateInvite} disabled={creatingInvite} className="text-xs text-cyan-400 hover:underline disabled:opacity-50">
                          {creatingInvite ? 'Creating...' : 'Invite'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-text-tertiary text-sm">No team</p>
                  )}
                </div>
              </div>

              {/* Invite URL if created */}
              {inviteUrl && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <input type="text" readOnly value={inviteUrl} className="flex-1 bg-bg-base border border-border-subtle rounded px-3 py-1.5 text-xs text-text-primary" />
                    <button onClick={() => navigator.clipboard.writeText(inviteUrl)} className="bg-green-500 text-white px-3 py-1.5 rounded text-xs font-medium hover:opacity-90">Copy</button>
                    <button onClick={() => setInviteUrl(null)} className="text-text-tertiary hover:text-text-primary p-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-text-tertiary text-xs mt-1.5">Expires in 7 days</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border-subtle flex justify-end">
                <button onClick={logout} className="text-text-tertiary hover:text-red-400 transition-colors text-sm">
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Setup Complete State */}
        {setupComplete ? (
          <div className="space-y-8">
            {/* Success Header */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">Recall is Active</h1>
                <p className="text-text-secondary mt-1">
                  Last connected {user.lastMcpConnection ? getTimeAgo(user.lastMcpConnection) : 'never'}
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-bg-elevated border border-border-subtle rounded-lg p-4">
                <p className="text-text-tertiary text-sm">Repositories</p>
                <p className="text-2xl font-bold text-text-primary">{repos.length}</p>
              </div>
              <div className="bg-bg-elevated border border-border-subtle rounded-lg p-4">
                <p className="text-text-tertiary text-sm">Initialized</p>
                <p className="text-2xl font-bold text-green-400">{repos.filter(r => r.initializedAt).length}</p>
              </div>
              <div className="bg-bg-elevated border border-border-subtle rounded-lg p-4">
                <p className="text-text-tertiary text-sm">Status</p>
                <p className="text-lg font-bold text-green-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Connected
                </p>
              </div>
            </div>

            {/* Repositories List */}
            <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Repositories</h2>
                <a href="/dashboard/repos" className="text-sm text-cyan-400 hover:underline">Manage</a>
              </div>
              <div className="space-y-2">
                {repos.map((repo) => (
                  <div key={repo.id} className="flex items-center justify-between p-3 bg-bg-base border border-border-subtle rounded-lg">
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="text-text-primary text-sm">{repo.fullName}</span>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-green-400">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Setup In Progress */
          <div className="space-y-8">
            {/* Header with Progress */}
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Complete Setup</h1>
              <p className="text-text-secondary mt-1">Follow these steps to activate Recall for your team.</p>

              {/* Progress Bar */}
              <div className="mt-6 flex items-center gap-4">
                <div className="flex-1 bg-bg-elevated rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-purple-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-text-secondary text-sm font-medium">{completedSteps}/{setupSteps.length}</span>
              </div>
            </div>

            {/* Steps as Expandable Cards */}
            <div className="space-y-4">
              {setupSteps.map((step, index) => {
                const isCurrentStep = currentStep?.id === step.id;
                const isPastStep = step.complete;
                const isFutureStep = !step.complete && !isCurrentStep;

                return (
                  <div
                    key={step.id}
                    className={`border rounded-lg overflow-hidden transition-all ${
                      isCurrentStep
                        ? 'border-cyan-500/50 bg-gradient-to-r from-cyan-500/5 to-purple-500/5'
                        : isPastStep
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-border-subtle bg-bg-elevated opacity-60'
                    }`}
                  >
                    {/* Step Header */}
                    <div className="flex items-center gap-4 p-4">
                      {/* Step Number/Check */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isPastStep
                          ? 'bg-green-500 text-white'
                          : isCurrentStep
                          ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                          : 'bg-bg-base border border-border-subtle text-text-tertiary'
                      }`}>
                        {isPastStep ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="font-bold">{index + 1}</span>
                        )}
                      </div>

                      {/* Step Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${
                          isPastStep ? 'text-green-400' : isCurrentStep ? 'text-text-primary' : 'text-text-tertiary'
                        }`}>
                          {step.label}
                        </p>
                        <p className="text-text-tertiary text-sm">{step.description}</p>
                      </div>

                      {/* Status Badge */}
                      {isPastStep && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Complete</span>
                      )}
                      {isCurrentStep && (
                        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                          Current
                        </span>
                      )}
                    </div>

                    {/* Step Content - Only show for current step or completed steps that might need action */}
                    {(isCurrentStep || (isPastStep && step.id === 'repos')) && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="ml-14">
                          {step.id === 'subscription' && (
                            <SubscriptionStep license={license} licenseLoading={licenseLoading} />
                          )}
                          {step.id === 'repos' && (
                            <ReposStep
                              repos={repos}
                              reposLoading={reposLoading}
                              initializingRepos={initializingRepos}
                              onInitialize={handleInitializeRepo}
                              onDisconnect={handleDisconnectRepo}
                            />
                          )}
                          {step.id === 'integrate' && (
                            <IntegrateStep
                              hasMcpConnection={hasMcpConnection}
                              lastMcpConnection={user.lastMcpConnection}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
