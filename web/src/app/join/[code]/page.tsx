'use client';

export const runtime = 'edge';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.recall.team';

interface TeamInfo {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  repoCount: number;
}

function JoinTeamContent() {
  const router = useRouter();
  const params = useParams();
  const inviteCode = params.code as string;
  const { user, loading: authLoading, refresh } = useAuth();

  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const fetchTeamInfo = async () => {
      try {
        const response = await fetch(`${API_URL}/invites/${inviteCode}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('This invite link is invalid or has expired.');
          }
          throw new Error('Failed to load invite');
        }
        const data = await response.json();
        setTeamInfo(data.team);
      } catch (err) {
        console.error('Failed to fetch team info:', err);
        setError(err instanceof Error ? err.message : 'Failed to load invite');
      } finally {
        setLoading(false);
      }
    };

    if (inviteCode) {
      fetchTeamInfo();
    }
  }, [inviteCode]);

  const handleGitHubConnect = () => {
    localStorage.setItem('join_invite_code', inviteCode);
    const redirectUri = `${window.location.origin}/auth/callback?join=${inviteCode}`;
    window.location.href = `${API_URL}/auth/github?redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  const handleJoin = async () => {
    const token = getToken();
    if (!token) {
      handleGitHubConnect();
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/invites/${inviteCode}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to join team');
      }

      setJoined(true);
      localStorage.removeItem('join_invite_code');

      // Refresh auth context
      await refresh();

      // Redirect to dashboard after a moment
      setTimeout(() => {
        router.push('/app');
      }, 2000);
    } catch (err) {
      console.error('Failed to join team:', err);
      setError(err instanceof Error ? err.message : 'Failed to join team');
    } finally {
      setJoining(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !teamInfo) {
    return (
      <div className="min-h-screen bg-bg-base">
        <header className="border-b border-border-subtle">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
            <a href="/" className="font-semibold text-xl text-text-primary">recall</a>
          </div>
        </header>
        <main className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 rounded-full bg-red-500/20 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Invalid Invite</h1>
            <p className="text-text-secondary mb-8">{error}</p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-text-primary text-bg-base rounded-lg font-semibold hover:translate-y-[-1px] hover:shadow-lg transition-all"
            >
              Go to Homepage
            </a>
          </div>
        </main>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-bg-base">
        <header className="border-b border-border-subtle">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
            <a href="/" className="font-semibold text-xl text-text-primary">recall</a>
          </div>
        </header>
        <main className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <motion.div
            className="text-center max-w-md px-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-16 h-16 rounded-full bg-green-500/20 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Welcome to {teamInfo?.name}!</h1>
            <p className="text-text-secondary mb-4">You're now a member of the team.</p>
            <p className="text-text-tertiary text-sm">Redirecting to dashboard...</p>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="font-semibold text-xl text-text-primary">recall</a>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-text-secondary text-sm">{user.githubUsername}</span>
              <button
                onClick={() => router.push('/app')}
                className="text-text-tertiary text-sm hover:text-text-secondary"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <motion.div
          className="max-w-md w-full px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-text-primary text-center mb-12">
            Join {teamInfo?.name}?
          </h1>

          <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 mb-8">
            <p className="text-text-secondary mb-6">You're joining as a team member.</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-text-tertiary">Team</span>
                <span className="text-text-primary font-medium">{teamInfo?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-tertiary">Members</span>
                <span className="text-text-primary">{teamInfo?.memberCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-tertiary">Repos</span>
                <span className="text-text-primary">{teamInfo?.repoCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-tertiary">Your role</span>
                <span className="text-text-primary">Developer</span>
              </div>
            </div>

            <p className="text-text-tertiary text-sm mt-6">
              You'll have access to team memory across all connected repos.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {user ? (
            <div className="space-y-4">
              <div className="bg-bg-elevated border border-border-subtle rounded-xl p-4 flex items-center gap-4">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || user.githubUsername || 'User'}
                    className="w-10 h-10 rounded-full border border-border-subtle"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-bg-base border border-border-subtle flex items-center justify-center">
                    <span className="text-text-tertiary">
                      {(user.name || user.githubUsername || '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-text-primary font-medium">{user.name || user.githubUsername}</p>
                  <p className="text-text-tertiary text-sm">{user.email}</p>
                </div>
                <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400">Connected</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="flex-1 py-3 bg-text-primary text-bg-base rounded-lg font-semibold hover:translate-y-[-1px] hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {joining ? 'Joining...' : `Join ${teamInfo?.name}`}
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 border border-border-subtle text-text-secondary rounded-lg font-medium hover:border-text-tertiary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleGitHubConnect}
                className="w-full flex items-center justify-center gap-3 py-4 bg-text-primary text-bg-base rounded-lg font-semibold hover:translate-y-[-1px] hover:shadow-lg transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                Connect with GitHub to join
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full py-3 border border-border-subtle text-text-secondary rounded-lg font-medium hover:border-text-tertiary transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <JoinTeamContent />
    </Suspense>
  );
}
