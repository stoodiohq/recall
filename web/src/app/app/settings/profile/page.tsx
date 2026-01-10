'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.recall.team';

function ProfileSettingsContent() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
    if (user) {
      setDisplayName(user.name || '');
    }
  }, [authLoading, user, router]);

  const handleSave = async () => {
    const token = getToken();
    if (!token) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: displayName }),
      });

      if (response.ok) {
        await refresh();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
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
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/app" className="font-semibold text-xl text-text-primary">recall</a>
            <span className="text-text-tertiary">/</span>
            <a href="/app/settings" className="text-text-secondary hover:text-text-primary">Settings</a>
            <span className="text-text-tertiary">/</span>
            <span className="text-text-secondary">Profile</span>
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
          <h1 className="text-2xl font-bold text-text-primary mb-8">Profile</h1>

          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || user.githubUsername || 'User'}
                  className="w-20 h-20 rounded-full border-2 border-border-subtle"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-bg-elevated border-2 border-border-subtle flex items-center justify-center">
                  <span className="text-2xl text-text-tertiary">
                    {(user?.name || user?.githubUsername || '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm text-text-tertiary">Avatar synced from GitHub</p>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Email
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="flex-1 bg-bg-base border border-border-subtle rounded-lg px-4 py-3 text-text-tertiary cursor-not-allowed"
                />
                <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400">verified</span>
              </div>
            </div>

            {/* GitHub Account */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                GitHub Account
              </label>
              <div className="flex items-center justify-between bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-text-tertiary" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  <span className="text-text-primary">@{user?.githubUsername}</span>
                </div>
                <span className="text-text-tertiary text-sm">Connected</span>
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-text-primary text-bg-base hover:translate-y-[-1px] hover:shadow-lg'
              } disabled:opacity-50`}
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default function ProfileSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ProfileSettingsContent />
    </Suspense>
  );
}
