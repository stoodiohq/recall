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

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, logout, login } = useAuth();
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(true);
  const [repos, setRepos] = useState<EnabledRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(true);

  // Handle token from URL (after OAuth redirect for returning users)
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      login(token).then(() => {
        // Remove token from URL without triggering navigation
        window.history.replaceState({}, '', '/dashboard');
      });
    }
  }, [searchParams, login]);

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
          headers: {
            'Authorization': `Bearer ${token}`,
          },
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

    if (user) {
      fetchLicense();
    }
  }, [user]);

  useEffect(() => {
    const fetchRepos = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/repos`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setRepos(data.repos || []);
        }
      } catch {
        // ignore
      } finally {
        setReposLoading(false);
      }
    };

    if (user) {
      fetchRepos();
    }
  }, [user]);

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
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove from local state
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
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Update repo in local state
        setRepos(repos.map(r =>
          r.id === repoId
            ? { ...r, initializedAt: new Date().toISOString() }
            : r
        ));
        console.log('Repo initialized:', data);
      } else {
        const error = await response.json();
        console.error('Failed to initialize repo:', error);
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

  if (!user) {
    return null;
  }

  const tierColors: Record<string, string> = {
    free: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    team: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    enterprise: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    // Legacy tiers for backwards compatibility
    starter: 'bg-green-500/20 text-green-400 border-green-500/30',
    business: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="font-semibold text-xl text-text-primary">
            recall
          </a>
          <div className="flex items-center gap-4">
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.name || user.githubUsername}
                className="w-8 h-8 rounded-full border border-border-subtle"
              />
            )}
            <span className="text-text-secondary text-sm">
              {user.name || user.githubUsername}
            </span>
            <button
              onClick={logout}
              className="text-text-tertiary hover:text-text-secondary transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Dashboard</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Account Card */}
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Account</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                {user.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || user.githubUsername}
                    className="w-16 h-16 rounded-full border border-border-subtle"
                  />
                )}
                <div>
                  <p className="text-text-primary font-medium">{user.name || user.githubUsername}</p>
                  <p className="text-text-secondary text-sm">{user.email}</p>
                  <p className="text-text-tertiary text-sm">@{user.githubUsername}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Card */}
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Subscription</h2>

            {licenseLoading ? (
              <div className="h-24 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : license?.valid && license.tier ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${tierColors[license.tier] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                    {license.tier.charAt(0).toUpperCase() + license.tier.slice(1)}
                  </span>
                </div>
                <div className="text-text-secondary">
                  <p>Seats: {license.seatsUsed} / {license.seats} used</p>
                </div>
                <div className="w-full bg-bg-base rounded-full h-2">
                  <div
                    className="bg-accent-primary h-2 rounded-full transition-all"
                    style={{ width: `${(license.seatsUsed / license.seats) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-text-secondary">No active subscription</p>
                <a
                  href="/#pricing"
                  className="inline-block bg-text-primary text-bg-base px-4 py-2 rounded-sm font-semibold hover:translate-y-[-1px] hover:shadow-lg transition-all"
                >
                  View Plans
                </a>
              </div>
            )}
          </div>

          {/* Team & Profile Card */}
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Team & Profile</h2>
              {user.team && (user.team.role === 'owner' || user.team.role === 'admin') && (
                <button
                  onClick={handleCreateInvite}
                  disabled={creatingInvite}
                  className="text-sm text-accent-primary hover:underline disabled:opacity-50"
                >
                  {creatingInvite ? 'Creating...' : '+ Invite Member'}
                </button>
              )}
            </div>

            {/* Invite Link Modal */}
            {inviteUrl && (
              <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-400 font-medium text-sm">Invite Link Created!</span>
                  <button
                    onClick={() => setInviteUrl(null)}
                    className="text-text-tertiary hover:text-text-primary"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-text-secondary text-xs mb-2">Share this link with your team member:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="flex-1 bg-bg-base border border-border-subtle rounded px-3 py-2 text-xs text-text-primary"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl);
                    }}
                    className="bg-text-primary text-bg-base px-3 py-2 rounded text-xs font-medium hover:opacity-90"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-text-tertiary text-xs mt-2">Expires in 7 days</p>
              </div>
            )}

            {user.team ? (
              <div className="space-y-4">
                <div>
                  <p className="text-text-primary font-semibold text-lg">{user.team.name}</p>
                  <p className="text-text-tertiary text-sm">
                    {user.team.tier.charAt(0).toUpperCase() + user.team.tier.slice(1)} plan
                  </p>
                </div>
                <div className="border-t border-border-subtle pt-4 space-y-2">
                  {user.profile?.role && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-tertiary">Your Role</span>
                      <span className="text-text-secondary">{user.profile.role}</span>
                    </div>
                  )}
                  {user.profile?.company && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-tertiary">Company</span>
                      <span className="text-text-secondary">{user.profile.company}</span>
                    </div>
                  )}
                  {user.profile?.teamSize && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-tertiary">Team Size</span>
                      <span className="text-text-secondary">{user.profile.teamSize} developers</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-text-tertiary">Your Team Role</span>
                    <span className="text-text-secondary">{user.team.role.charAt(0).toUpperCase() + user.team.role.slice(1)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-text-secondary">No team yet</p>
                <a
                  href="/onboarding"
                  className="inline-block text-accent-primary hover:underline text-sm"
                >
                  Complete setup
                </a>
              </div>
            )}
          </div>

          {/* MCP Integration Status Card */}
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">AI Tool Integration</h2>
            <div className="space-y-4">
              <p className="text-text-secondary text-sm">
                Add Recall to your AI coding tool to get team memory in every session.
              </p>

              <div className="bg-bg-base border border-border-subtle rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-text-primary font-medium text-sm">Claude Code</span>
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Ready</span>
                </div>
                <p className="text-text-tertiary text-xs mb-3">Add to your claude_desktop_config.json:</p>
                <div className="relative">
                  <pre className="bg-bg-elevated p-3 pr-10 rounded text-xs text-text-secondary overflow-x-auto">
{`"recall": {
  "command": "npx",
  "args": ["-y", "@recall/mcp-server"]
}`}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`"recall": {
  "command": "npx",
  "args": ["-y", "@recall/mcp-server"]
}`);
                    }}
                    className="absolute top-2 right-2 p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-base rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="bg-bg-base border border-border-subtle rounded-lg p-4 opacity-60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-primary font-medium text-sm">Cursor & Windsurf</span>
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Coming Soon</span>
                </div>
                <p className="text-text-tertiary text-xs">MCP support for Cursor and Windsurf is in development.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Connected Repositories */}
        <div className="mt-8 bg-bg-elevated border border-border-subtle rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">Connected Repositories</h2>
            <a
              href="/dashboard/repos"
              className="text-sm text-accent-primary hover:underline"
            >
              + Manage repos
            </a>
          </div>

          {reposLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : repos.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-text-tertiary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p className="text-text-secondary mb-4">No repositories connected yet</p>
              <a
                href="/dashboard/repos"
                className="inline-block bg-text-primary text-bg-base px-4 py-2 rounded-sm font-medium hover:translate-y-[-1px] hover:shadow-lg transition-all"
              >
                Connect Repositories
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-center justify-between p-4 bg-bg-base border border-border-subtle rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <div>
                      <p className="text-text-primary font-medium">{repo.fullName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {repo.private && (
                          <span className="flex items-center gap-1 text-xs text-text-tertiary">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Private
                          </span>
                        )}
                        {repo.language && (
                          <span className="text-xs text-text-tertiary">{repo.language}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {repo.initializedAt ? (
                      <span className="flex items-center gap-2 text-sm text-green-400">
                        <span className="w-2 h-2 bg-green-400 rounded-full" />
                        Active
                      </span>
                    ) : initializingRepos.has(repo.id) ? (
                      <span className="flex items-center gap-2 text-sm text-cyan-400">
                        <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        Initializing...
                      </span>
                    ) : (
                      <button
                        onClick={() => handleInitializeRepo(repo.id)}
                        className="flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
                      >
                        <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                        Initialize
                      </button>
                    )}
                    <button
                      onClick={() => handleDisconnectRepo(repo.id)}
                      className="text-text-tertiary hover:text-red-400 transition-colors p-1"
                      title="Disconnect repository"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
