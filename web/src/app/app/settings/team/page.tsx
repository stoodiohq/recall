'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.recall.team';

interface Team {
  id: string;
  name: string;
  slug: string;
  tier: string;
  seats: number;
  role: string;
}

function TeamSettingsContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const fetchTeam = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/teams/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setTeam(data.team);
          setTeamName(data.team?.name || '');
        }
      } catch (error) {
        console.error('Failed to fetch team:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTeam();
    }
  }, [user]);

  const handleSave = async () => {
    const token = getToken();
    if (!token || !team) return;

    setSaving(true);
    try {
      // Note: This endpoint would need to be implemented
      const response = await fetch(`${API_URL}/teams/${team.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: teamName }),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const isOwner = team?.role === 'owner';

  if (authLoading || loading) {
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
            <span className="text-text-secondary">Team</span>
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
          <h1 className="text-2xl font-bold text-text-primary mb-8">Team Settings</h1>

          <div className="space-y-6">
            {/* Team Name */}
            <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Team Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    disabled={!isOwner}
                    className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Team Slug
                  </label>
                  <input
                    type="text"
                    value={team?.slug || ''}
                    disabled
                    className="w-full bg-bg-base border border-border-subtle rounded-lg px-4 py-3 text-text-tertiary cursor-not-allowed"
                  />
                  <p className="text-xs text-text-tertiary mt-1">Used in invite links</p>
                </div>

                {isOwner && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      saved
                        ? 'bg-green-500 text-white'
                        : 'bg-text-primary text-bg-base hover:translate-y-[-1px]'
                    } disabled:opacity-50`}
                  >
                    {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                  </button>
                )}
              </div>
            </div>

            {/* Team Members Link */}
            <a
              href="/app/team"
              className="flex items-center justify-between bg-bg-elevated border border-border-subtle rounded-lg p-6 hover:border-text-tertiary transition-colors"
            >
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Manage Team Members</h2>
                <p className="text-text-tertiary">Invite members, manage roles, view activity</p>
              </div>
              <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>

            {/* Danger Zone */}
            {isOwner && (
              <div className="bg-bg-elevated border border-red-500/30 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-text-primary mb-1">Delete Team</h3>
                    <p className="text-text-tertiary text-sm mb-3">
                      This will permanently delete your team and remove all members. This action cannot be undone.
                    </p>

                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 border border-red-500/50 text-red-400 rounded-lg font-medium hover:bg-red-500/10 transition-colors"
                      >
                        Delete Team
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-text-secondary">
                          Type <strong className="text-red-400">{team?.name}</strong> to confirm:
                        </p>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          className="w-full bg-bg-base border border-red-500/30 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-red-500"
                          placeholder={team?.name}
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeleteConfirmText('');
                            }}
                            className="px-4 py-2 border border-border-visible text-text-secondary rounded-lg font-medium hover:border-text-tertiary transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            disabled={deleteConfirmText !== team?.name}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Delete Team Forever
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default function TeamSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TeamSettingsContent />
    </Suspense>
  );
}
