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

const AI_TOOLS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    configFile: '~/.claude/claude_desktop_config.json',
    config: `"recall": {
  "command": "npx",
  "args": ["-y", "@recall/mcp-server"]
}`,
    docs: 'https://docs.recall.team/integrations/claude-code',
    status: 'ready' as const,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.5 3L4 14h7l-1.5 7L20 10h-7l1.5-7z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    configFile: '~/.cursor/mcp.json',
    config: `{
  "mcpServers": {
    "recall": {
      "command": "npx",
      "args": ["-y", "@recall/mcp-server"]
    }
  }
}`,
    docs: 'https://docs.recall.team/integrations/cursor',
    status: 'ready' as const,
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8z" opacity="0.3"/>
        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    configFile: '~/.gemini/settings.json',
    config: `{
  "mcpServers": {
    "recall": {
      "command": "npx",
      "args": ["-y", "@recall/mcp-server"]
    }
  }
}`,
    docs: 'https://docs.recall.team/integrations/gemini-cli',
    status: 'ready' as const,
  },
  {
    id: 'codex-cli',
    name: 'OpenAI Codex CLI',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v4m0 12v4m-7-7H2m20 0h-3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1m0-12.8l-2.1 2.1m-8.6 8.6l-2.1 2.1"/>
      </svg>
    ),
    configFile: '~/.codex/config.json',
    config: `{
  "mcpServers": {
    "recall": {
      "command": "npx",
      "args": ["-y", "@recall/mcp-server"]
    }
  }
}`,
    docs: 'https://docs.recall.team/integrations/codex-cli',
    status: 'ready' as const,
  },
];

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, logout, login } = useAuth();
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(true);
  const [repos, setRepos] = useState<EnabledRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [copiedTool, setCopiedTool] = useState<string | null>(null);

  // Track which tools the user has configured (persisted in localStorage)
  const [configuredTools, setConfiguredTools] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recall_configured_tools');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('recall_configured_tools', JSON.stringify([...configuredTools]));
    }
  }, [configuredTools]);

  // Handle token from URL (after OAuth redirect for returning users)
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      login(token).then(() => {
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
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/repos`, {
          headers: { 'Authorization': `Bearer ${token}` },
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

    if (user) fetchRepos();
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

  const handleCopyConfig = (toolId: string, config: string) => {
    navigator.clipboard.writeText(config);
    setCopiedTool(toolId);
    setTimeout(() => setCopiedTool(null), 2000);
  };

  const handleMarkConfigured = (toolId: string) => {
    setConfiguredTools(prev => {
      const next = new Set(prev);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return next;
    });
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
  const hasConfiguredTool = configuredTools.size > 0;

  const setupSteps = [
    { id: 'subscription', label: 'Active subscription', complete: !!hasSubscription },
    { id: 'repos', label: 'Connect repositories', complete: hasRepos },
    { id: 'initialize', label: 'Initialize memory', complete: hasInitializedRepos },
    { id: 'integrate', label: 'Configure AI tool', complete: hasConfiguredTool },
  ];

  const completedSteps = setupSteps.filter(s => s.complete).length;
  const setupComplete = completedSteps === setupSteps.length;
  const progressPercent = (completedSteps / setupSteps.length) * 100;

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
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="font-semibold text-xl text-text-primary">recall</a>
          <div className="flex items-center gap-4">
            {user.avatarUrl && (
              <img src={user.avatarUrl} alt={user.name || user.githubUsername} className="w-8 h-8 rounded-full border border-border-subtle" />
            )}
            <span className="text-text-secondary text-sm">{user.name || user.githubUsername}</span>
            <button onClick={logout} className="text-text-tertiary hover:text-text-secondary transition-colors text-sm">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Dashboard</h1>

        {/* Setup Progress Banner */}
        {!setupComplete && (
          <div className="mb-8 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Complete Setup to Activate Recall
                </h2>
                <p className="text-text-secondary text-sm mt-1">
                  Recall needs to be configured in your AI coding tool to provide team memory.
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-text-primary">{completedSteps}/{setupSteps.length}</span>
                <p className="text-text-tertiary text-xs">steps complete</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-bg-base rounded-full h-2 mb-4">
              <div
                className="bg-gradient-to-r from-cyan-400 to-purple-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Setup Steps */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {setupSteps.map((step, i) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    step.complete
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-bg-base border-border-subtle'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.complete
                      ? 'bg-green-500 text-white'
                      : 'bg-bg-elevated text-text-tertiary border border-border-subtle'
                  }`}>
                    {step.complete ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-sm ${step.complete ? 'text-green-400' : 'text-text-secondary'}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Banner when complete */}
        {setupComplete && (
          <div className="mb-8 bg-green-500/10 border border-green-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-green-400">Recall is Active!</h2>
                <p className="text-text-secondary text-sm">Your AI coding tool now has access to team memory.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Account Card */}
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Account</h2>
            <div className="flex items-center gap-4">
              {user.avatarUrl && (
                <img src={user.avatarUrl} alt={user.name || user.githubUsername} className="w-16 h-16 rounded-full border border-border-subtle" />
              )}
              <div>
                <p className="text-text-primary font-medium">{user.name || user.githubUsername}</p>
                <p className="text-text-secondary text-sm">{user.email}</p>
                <p className="text-text-tertiary text-sm">@{user.githubUsername}</p>
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
                  <div className="bg-accent-primary h-2 rounded-full transition-all" style={{ width: `${(license.seatsUsed / license.seats) * 100}%` }} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-text-secondary">No active subscription</p>
                <a href="/#pricing" className="inline-block bg-text-primary text-bg-base px-4 py-2 rounded-sm font-semibold hover:translate-y-[-1px] hover:shadow-lg transition-all">
                  View Plans
                </a>
              </div>
            )}
          </div>

          {/* Team Card */}
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Team</h2>
              {user.team && (user.team.role === 'owner' || user.team.role === 'admin') && (
                <button onClick={handleCreateInvite} disabled={creatingInvite} className="text-sm text-accent-primary hover:underline disabled:opacity-50">
                  {creatingInvite ? 'Creating...' : '+ Invite Member'}
                </button>
              )}
            </div>

            {inviteUrl && (
              <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-400 font-medium text-sm">Invite Link Created!</span>
                  <button onClick={() => setInviteUrl(null)} className="text-text-tertiary hover:text-text-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input type="text" readOnly value={inviteUrl} className="flex-1 bg-bg-base border border-border-subtle rounded px-3 py-2 text-xs text-text-primary" />
                  <button onClick={() => navigator.clipboard.writeText(inviteUrl)} className="bg-text-primary text-bg-base px-3 py-2 rounded text-xs font-medium hover:opacity-90">Copy</button>
                </div>
                <p className="text-text-tertiary text-xs mt-2">Expires in 7 days</p>
              </div>
            )}

            {user.team ? (
              <div className="space-y-3">
                <p className="text-text-primary font-semibold">{user.team.name}</p>
                <p className="text-text-tertiary text-sm">{user.team.tier.charAt(0).toUpperCase() + user.team.tier.slice(1)} plan</p>
                <div className="flex justify-between text-sm">
                  <span className="text-text-tertiary">Your Role</span>
                  <span className="text-text-secondary">{user.team.role.charAt(0).toUpperCase() + user.team.role.slice(1)}</span>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-text-secondary">No team yet</p>
                <a href="/onboarding" className="text-accent-primary hover:underline text-sm">Complete setup</a>
              </div>
            )}
          </div>
        </div>

        {/* AI Tool Integration - Full Width */}
        <div className="mt-8 bg-bg-elevated border border-border-subtle rounded-lg p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                AI Tool Integration
                {!hasConfiguredTool && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Required</span>
                )}
              </h2>
              <p className="text-text-secondary text-sm mt-1">
                Add Recall to your AI coding tool. This step is <strong className="text-text-primary">required</strong> for Recall to provide team memory in your coding sessions.
              </p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-amber-400 font-medium text-sm">Configuration Required</p>
                <p className="text-text-secondary text-sm mt-1">
                  Recall runs as an MCP server inside your AI tool. Copy the configuration below and add it to your tool&apos;s config file. After adding, mark it as configured.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {AI_TOOLS.map((tool) => (
              <div
                key={tool.id}
                className={`border rounded-lg overflow-hidden transition-all ${
                  configuredTools.has(tool.id)
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-border-subtle bg-bg-base'
                }`}
              >
                {/* Tool Header */}
                <button
                  onClick={() => setExpandedTool(expandedTool === tool.id ? null : tool.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-bg-elevated/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      configuredTools.has(tool.id) ? 'bg-green-500/20 text-green-400' : 'bg-bg-elevated text-text-secondary'
                    }`}>
                      {tool.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-text-primary font-medium">{tool.name}</p>
                      <p className="text-text-tertiary text-xs">{tool.configFile}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {configuredTools.has(tool.id) && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Configured</span>
                    )}
                    <svg
                      className={`w-5 h-5 text-text-tertiary transition-transform ${expandedTool === tool.id ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Config */}
                {expandedTool === tool.id && (
                  <div className="px-4 pb-4 border-t border-border-subtle">
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-text-tertiary text-xs">Add to {tool.configFile}:</p>
                        <button
                          onClick={() => handleCopyConfig(tool.id, tool.config)}
                          className="flex items-center gap-1 text-xs text-accent-primary hover:underline"
                        >
                          {copiedTool === tool.id ? (
                            <>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="bg-bg-elevated p-3 rounded text-xs text-text-secondary overflow-x-auto">
                        {tool.config}
                      </pre>
                    </div>

                    <button
                      onClick={() => handleMarkConfigured(tool.id)}
                      className={`mt-4 w-full py-2 rounded font-medium text-sm transition-all ${
                        configuredTools.has(tool.id)
                          ? 'bg-bg-elevated text-text-secondary hover:bg-red-500/10 hover:text-red-400'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {configuredTools.has(tool.id) ? 'Mark as Not Configured' : 'I\'ve Added This Configuration'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Connected Repositories */}
        <div className="mt-8 bg-bg-elevated border border-border-subtle rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">Connected Repositories</h2>
            <a href="/dashboard/repos" className="text-sm text-accent-primary hover:underline">+ Manage repos</a>
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
              <a href="/dashboard/repos" className="inline-block bg-text-primary text-bg-base px-4 py-2 rounded-sm font-medium hover:translate-y-[-1px] hover:shadow-lg transition-all">
                Connect Repositories
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {repos.map((repo) => (
                <div key={repo.id} className="flex items-center justify-between p-4 bg-bg-base border border-border-subtle rounded-lg">
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
                        {repo.language && <span className="text-xs text-text-tertiary">{repo.language}</span>}
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
                      <button onClick={() => handleInitializeRepo(repo.id)} className="flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300 transition-colors">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                        Initialize
                      </button>
                    )}
                    <button onClick={() => handleDisconnectRepo(repo.id)} className="text-text-tertiary hover:text-red-400 transition-colors p-1" title="Disconnect repository">
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
