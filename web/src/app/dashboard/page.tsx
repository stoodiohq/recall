'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getToken, getGitHubAuthUrl } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://recall-api.stoodiohq.workers.dev';

interface LicenseStatus {
  valid: boolean;
  tier: string | null;
  seats: number;
  seatsUsed: number;
  features: string[];
  message?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

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
    starter: 'bg-green-500/20 text-green-400 border-green-500/30',
    team: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    business: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    enterprise: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
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

          {/* Team Card */}
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Team</h2>
            {user.team ? (
              <div className="space-y-3">
                <p className="text-text-primary font-medium">{user.team.name}</p>
                <p className="text-text-secondary text-sm">
                  Role: {user.team.role.charAt(0).toUpperCase() + user.team.role.slice(1)}
                </p>
                <p className="text-text-tertiary text-sm">
                  {user.team.seats} seat{user.team.seats !== 1 ? 's' : ''} on {user.team.tier} plan
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-text-secondary">No team yet</p>
                <button className="text-accent-primary hover:underline text-sm">
                  Create a team
                </button>
              </div>
            )}
          </div>

          {/* Quick Start Card */}
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Start</h2>
            <div className="space-y-4">
              <div>
                <p className="text-text-secondary text-sm mb-2">1. Install the CLI</p>
                <code className="block bg-bg-base border border-border-subtle rounded px-3 py-2 text-sm font-mono text-text-primary">
                  npm install -g recall-cli
                </code>
              </div>
              <div>
                <p className="text-text-secondary text-sm mb-2">2. Authenticate</p>
                <code className="block bg-bg-base border border-border-subtle rounded px-3 py-2 text-sm font-mono text-text-primary">
                  recall auth
                </code>
              </div>
              <div>
                <p className="text-text-secondary text-sm mb-2">3. Initialize in your repo</p>
                <code className="block bg-bg-base border border-border-subtle rounded px-3 py-2 text-sm font-mono text-text-primary">
                  cd your-project && recall init
                </code>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
