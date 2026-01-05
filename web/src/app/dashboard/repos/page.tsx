'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://recall-api.stoodiohq.workers.dev';

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  language: string | null;
}

interface EnabledRepo {
  id: string;
  githubRepoId: number;
  fullName: string;
}

export default function ReposPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [enabledRepos, setEnabledRepos] = useState<EnabledRepo[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

  useEffect(() => {
    const fetchRepos = async () => {
      const token = getToken();
      if (!token) return;

      try {
        // Fetch both GitHub repos and enabled repos in parallel
        const [githubResponse, enabledResponse] = await Promise.all([
          fetch(`${API_URL}/github/repos`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
          fetch(`${API_URL}/repos`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
        ]);

        if (githubResponse.ok) {
          const data = await githubResponse.json();
          setGithubRepos(data.repos || []);
        } else {
          setError('Failed to fetch GitHub repositories');
        }

        if (enabledResponse.ok) {
          const data = await enabledResponse.json();
          setEnabledRepos(data.repos || []);
          // Pre-select already enabled repos
          const enabledIds = new Set<number>((data.repos || []).map((r: EnabledRepo) => r.githubRepoId));
          setSelectedRepos(enabledIds);
        }
      } catch (err) {
        console.error('Failed to fetch repos:', err);
        setError('Failed to fetch repositories');
      } finally {
        setLoadingRepos(false);
      }
    };

    if (user) {
      fetchRepos();
    }
  }, [user]);

  const toggleRepo = (repoId: number) => {
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

  const handleSave = async () => {
    const token = getToken();
    if (!token) return;

    setSaving(true);
    setError(null);

    try {
      // Get currently enabled repo IDs
      const currentlyEnabled = new Set(enabledRepos.map(r => r.githubRepoId));

      // Find repos to add (selected but not currently enabled)
      const toAdd = githubRepos.filter(r => selectedRepos.has(r.id) && !currentlyEnabled.has(r.id));

      // Find repos to remove (currently enabled but not selected)
      const toRemove = enabledRepos.filter(r => !selectedRepos.has(r.githubRepoId));

      // Add new repos
      for (const repo of toAdd) {
        await fetch(`${API_URL}/repos`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            githubRepoId: repo.id,
            name: repo.name,
            fullName: repo.fullName,
            private: repo.private,
            description: repo.description,
            language: repo.language,
          }),
        });
      }

      // Remove deselected repos
      for (const repo of toRemove) {
        await fetch(`${API_URL}/repos/${repo.id}/toggle`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to save repos:', err);
      setError('Failed to save repository changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingRepos) {
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
      {/* Header */}
      <header className="border-b border-border-subtle bg-bg-elevated">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-text-tertiary hover:text-text-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-text-primary">Manage Repositories</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">
              {selectedRepos.size} selected
            </span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-text-primary text-bg-base px-4 py-2 rounded-sm font-medium hover:translate-y-[-1px] hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <p className="text-text-secondary mb-6">
          Select the repositories you want Recall to track. Memory files will be added to each selected repository.
        </p>

        <div className="space-y-2">
          {githubRepos.map((repo) => {
            const isEnabled = enabledRepos.some(r => r.githubRepoId === repo.id);
            const isSelected = selectedRepos.has(repo.id);

            return (
              <button
                key={repo.id}
                onClick={() => toggleRepo(repo.id)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/30'
                    : 'bg-bg-elevated border-border-subtle hover:border-text-tertiary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-cyan-500 border-cyan-500'
                        : 'border-text-tertiary'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-bg-base" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-text-primary font-medium">{repo.fullName}</p>
                      {repo.description && (
                        <p className="text-text-tertiary text-sm mt-0.5 line-clamp-1">{repo.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
                    {isEnabled && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                        Added
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {githubRepos.length === 0 && !error && (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-text-tertiary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-text-secondary">No repositories found in your GitHub account</p>
          </div>
        )}
      </main>
    </div>
  );
}
