'use client';

export const runtime = 'edge';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { getToken } from '@/lib/auth';
import { SkeletonStats, SkeletonList } from '@/components/ui/Skeleton';
import { ErrorState, NotFoundError } from '@/components/ui/ErrorState';
import { NoSessionsEmpty } from '@/components/ui/EmptyState';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.recall.team';

interface Repo {
  id: string;
  githubId: number;
  name: string;
  fullName: string;
  private: boolean;
  enabled: boolean;
  initialized: boolean;
  lastActivity: string | null;
}

interface Session {
  id: string;
  date: string;
  user: string;
  summary: string;
  status?: string;
  decision?: string;
  lesson?: string;
}

type Tab = 'overview' | 'sessions' | 'context' | 'history';

function RepoDetailContent() {
  const router = useRouter();
  const params = useParams();
  const repoId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [repo, setRepo] = useState<Repo | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState({ totalSessions: 0, teamMembers: 0, thisWeek: 0 });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const fetchRepoData = async () => {
      const token = getToken();
      if (!token || !repoId) return;

      try {
        // Fetch repos to find this one
        const response = await fetch(`${API_URL}/repos`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          const foundRepo = data.repos?.find((r: Repo) => r.id === repoId || r.githubId?.toString() === repoId);
          if (foundRepo) {
            setRepo(foundRepo);
            // Mock stats for now
            setStats({
              totalSessions: Math.floor(Math.random() * 100) + 10,
              teamMembers: Math.floor(Math.random() * 5) + 1,
              thisWeek: Math.floor(Math.random() * 15) + 1,
            });
            // Mock sessions
            setSessions([
              {
                id: '1',
                date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                user: user?.githubUsername || 'unknown',
                summary: 'Implemented rate limiting for API endpoints',
                status: 'In Progress',
                decision: 'Using Redis for rate limit storage',
              },
              {
                id: '2',
                date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                user: user?.githubUsername || 'unknown',
                summary: 'Fixed authentication token refresh logic',
                status: 'Complete',
                lesson: 'Cross-tab state requires BroadcastChannel API',
              },
              {
                id: '3',
                date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
                user: user?.githubUsername || 'unknown',
                summary: 'Added payment webhook retry mechanism',
                status: 'Complete',
                decision: 'Exponential backoff with 5 retries max',
              },
            ]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch repo:', err);
        setError('Failed to load repository data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRepoData();
    }
  }, [user, repoId]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return 'just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg-base">
        <header className="border-b border-border-subtle">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
            <a href="/app" className="font-semibold text-xl text-text-primary">recall</a>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="h-8 w-64 bg-bg-elevated rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-bg-elevated rounded animate-pulse" />
          </div>
          <SkeletonStats count={3} />
          <div className="mt-8">
            <SkeletonList items={3} />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-base">
        <header className="border-b border-border-subtle">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
            <a href="/app" className="font-semibold text-xl text-text-primary">recall</a>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">
          <ErrorState
            title="Failed to load repository"
            message={error}
            onRetry={() => { setLoading(true); setError(null); }}
          />
        </main>
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="min-h-screen bg-bg-base">
        <header className="border-b border-border-subtle">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
            <a href="/app" className="font-semibold text-xl text-text-primary">recall</a>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">
          <NotFoundError />
          <div className="text-center mt-4">
            <a href="/app/repos" className="text-cyan-400 hover:underline">Back to repos</a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/app" className="font-semibold text-xl text-text-primary">recall</a>
            <span className="text-text-tertiary">/</span>
            <a href="/app/repos" className="text-text-secondary hover:text-text-primary">Repos</a>
            <span className="text-text-tertiary">/</span>
            <span className="text-text-primary">{repo.name}</span>
          </div>
          <a href="/app/repos" className="text-text-tertiary hover:text-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Repo header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{repo.fullName}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`flex items-center gap-1.5 text-sm ${repo.initialized ? 'text-green-400' : 'text-yellow-400'}`}>
                <span className={`w-2 h-2 rounded-full ${repo.initialized ? 'bg-green-400' : 'bg-yellow-400'}`} />
                {repo.initialized ? 'Active' : 'Not initialized'}
              </span>
              {repo.private && (
                <span className="px-2 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-400">Private</span>
              )}
            </div>
          </div>
          <a
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </a>
        </motion.div>

        {/* Tabs */}
        <div className="border-b border-border-subtle mb-8">
          <nav className="flex gap-6">
            {(['overview', 'sessions', 'context', 'history'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-cyan-500 text-text-primary'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-text-primary mb-1">{stats.totalSessions}</div>
                <div className="text-sm text-text-tertiary">Sessions (all time)</div>
              </div>
              <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-text-primary mb-1">{stats.teamMembers}</div>
                <div className="text-sm text-text-tertiary">Team Members (active)</div>
              </div>
              <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-text-primary mb-1">{stats.thisWeek}</div>
                <div className="text-sm text-text-tertiary">This Week (sessions)</div>
              </div>
            </div>

            {/* Recent sessions */}
            <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Sessions</h2>
            <div className="bg-bg-elevated border border-border-subtle rounded-lg overflow-hidden">
              {sessions.length === 0 ? (
                <NoSessionsEmpty />
              ) : (
                <div className="divide-y divide-border-subtle">
                  {sessions.map((session) => (
                    <div key={session.id} className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-text-primary font-medium">@{session.user}</span>
                          <span className="text-text-tertiary text-sm ml-2">{formatTimeAgo(session.date)}</span>
                        </div>
                        {session.status && (
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            session.status === 'Complete'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {session.status}
                          </span>
                        )}
                      </div>
                      <p className="text-text-secondary mb-2">{session.summary}</p>
                      {session.decision && (
                        <p className="text-sm text-cyan-400">
                          <span className="font-medium">Decision:</span> {session.decision}
                        </p>
                      )}
                      {session.lesson && (
                        <p className="text-sm text-purple-400">
                          <span className="font-medium">Lesson:</span> {session.lesson}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'sessions' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-bg-elevated border border-border-subtle rounded-lg overflow-hidden">
              {sessions.length === 0 ? (
                <NoSessionsEmpty />
              ) : (
                <div className="divide-y divide-border-subtle">
                  {sessions.map((session) => (
                    <div key={session.id} className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-text-primary font-medium">@{session.user}</span>
                          <span className="text-text-tertiary text-sm ml-2">{formatTimeAgo(session.date)}</span>
                        </div>
                        <button className="text-cyan-400 hover:text-cyan-300 text-sm">View</button>
                      </div>
                      <p className="text-text-secondary">{session.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'context' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-text-primary mb-2">What Your AI Knows</h2>
              <p className="text-text-secondary">
                At the start of every session, your AI receives team context (~2,100 tokens). Here&apos;s what&apos;s included:
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
                <h3 className="flex items-center gap-2 text-text-primary font-medium mb-2">
                  <span>📋</span> Project Overview
                </h3>
                <p className="text-text-secondary text-sm mb-2">
                  Basic info about your codebase - tech stack, structure, key integrations.
                </p>
                <p className="text-text-tertiary text-sm italic">
                  Example: &quot;Node.js API, PostgreSQL, monorepo structure&quot;
                </p>
              </div>

              <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
                <h3 className="flex items-center gap-2 text-text-primary font-medium mb-2">
                  <span>📐</span> Team Conventions
                </h3>
                <p className="text-text-secondary text-sm mb-2">
                  How your team writes code - naming, patterns, standards.
                </p>
                <p className="text-text-tertiary text-sm italic">
                  Example: &quot;snake_case in DB, camelCase in code, Zod validation&quot;
                </p>
              </div>

              <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
                <h3 className="flex items-center gap-2 text-text-primary font-medium mb-2">
                  <span>⚠️</span> Known Pitfalls
                </h3>
                <p className="text-text-secondary text-sm mb-2">
                  Mistakes your team has already made - so AI can warn others.
                </p>
                <p className="text-text-tertiary text-sm italic">
                  Example: &quot;localStorage breaks Safari private mode&quot;
                </p>
              </div>

              <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
                <h3 className="flex items-center gap-2 text-text-primary font-medium mb-2">
                  <span>🔄</span> Active Work
                </h3>
                <p className="text-text-secondary text-sm mb-2">
                  What teammates are currently working on - status, blockers.
                </p>
                <p className="text-text-tertiary text-sm italic">
                  Example: &quot;@steve: Rate limiting (blocked), @sarah: Checkout (60%)&quot;
                </p>
              </div>
            </div>

            <p className="text-text-tertiary text-sm mt-6">
              This context is built automatically from your team&apos;s sessions. The more you use Recall, the smarter your AI gets.
            </p>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-text-primary mb-2">Session History</h2>
              <p className="text-text-secondary">
                Complete history of team decisions, lessons, and resolved issues. This is what your AI sees when you say &quot;remember&quot;.
              </p>
            </div>

            <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6">
              <p className="text-text-tertiary text-center">
                History is generated from your session data. Start saving sessions to build your team&apos;s knowledge base.
              </p>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default function RepoDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RepoDetailContent />
    </Suspense>
  );
}
