'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { getToken } from '@/lib/auth';
import { SkeletonList } from '@/components/ui/Skeleton';
import { NoActivityEmpty } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.recall.team';

interface ActivityItem {
  id: string;
  type: 'session' | 'decision' | 'lesson' | 'context_load' | 'member_joined';
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    githubUsername: string | null;
  };
  repo?: string;
  summary?: string;
  createdAt: string;
}

function ActivityContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'sessions' | 'decisions'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const fetchActivity = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/teams/activity`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          // Transform API data to our format
          const items: ActivityItem[] = (data.activity || []).map((item: {
            id: string;
            fileType: string;
            action: string;
            repoName: string | null;
            createdAt: string;
            user: {
              id: string;
              name: string | null;
              avatarUrl: string | null;
              githubUsername: string | null;
            };
          }) => ({
            id: item.id,
            type: item.action === 'write' ? 'session' : 'context_load',
            user: item.user,
            repo: item.repoName,
            summary: item.action === 'write'
              ? `Updated ${item.fileType}.md`
              : `Loaded ${item.fileType}.md`,
            createdAt: item.createdAt,
          }));
          setActivity(items);
        }
      } catch (err) {
        console.error('Failed to fetch activity:', err);
        setError('Failed to load activity feed');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchActivity();
    }
  }, [user]);

  const formatTimeAgo = (dateString: string) => {
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
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'session':
        return (
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
        );
      case 'decision':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'lesson':
        return (
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        );
      case 'context_load':
        return (
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
        );
      case 'member_joined':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-bg-base flex items-center justify-center">
            <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const filteredActivity = activity.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'sessions') return item.type === 'session' || item.type === 'context_load';
    if (filter === 'decisions') return item.type === 'decision' || item.type === 'lesson';
    return true;
  });

  const refetch = () => {
    setLoading(true);
    setError(null);
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
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/app" className="font-semibold text-xl text-text-primary">recall</a>
            <span className="text-text-tertiary">/</span>
            <span className="text-text-secondary">Activity</span>
          </div>
          <a href="/app" className="text-text-tertiary hover:text-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Activity Feed</h1>
              <p className="text-text-secondary mt-1">See what your team is working on</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6">
            {(['all', 'sessions', 'decisions'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  filter === f
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-bg-elevated text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="bg-bg-elevated border border-border-subtle rounded-lg p-4">
              <SkeletonList items={5} />
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="bg-bg-elevated border border-border-subtle rounded-lg">
              <ErrorState
                title="Failed to load activity"
                message={error}
                onRetry={refetch}
              />
            </div>
          )}

          {/* Activity list */}
          {!loading && !error && (
            <div className="bg-bg-elevated border border-border-subtle rounded-lg overflow-hidden">
              {filteredActivity.length === 0 ? (
                <NoActivityEmpty />
              ) : (
              <div className="divide-y divide-border-subtle">
                {filteredActivity.map((item, index) => (
                  <motion.div
                    key={item.id}
                    className="p-4 flex items-start gap-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {item.user.avatarUrl ? (
                      <img
                        src={item.user.avatarUrl}
                        alt={item.user.name || item.user.githubUsername || 'User'}
                        className="w-10 h-10 rounded-full border border-border-subtle"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-bg-base border border-border-subtle flex items-center justify-center">
                        <span className="text-text-tertiary text-sm">
                          {(item.user.name || item.user.githubUsername || '?')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-text-primary">
                          {item.user.name || item.user.githubUsername || 'Unknown'}
                        </span>
                        {getActivityIcon(item.type)}
                      </div>
                      <p className="text-text-secondary text-sm">
                        {item.summary}
                        {item.repo && (
                          <span className="text-text-tertiary"> in {item.repo}</span>
                        )}
                      </p>
                    </div>
                    <span className="text-text-tertiary text-sm whitespace-nowrap">
                      {formatTimeAgo(item.createdAt)}
                    </span>
                  </motion.div>
                ))}
              </div>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

export default function ActivityPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ActivityContent />
    </Suspense>
  );
}
