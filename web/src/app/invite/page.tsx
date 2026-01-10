'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.recall.team';

interface InviteDetails {
  valid: boolean;
  teamName: string;
  teamSlug: string;
  invitedBy: string;
  role: string;
  email: string | null;
  expiresAt: string;
}

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const { user, loading: authLoading } = useAuth();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!code) {
        setError('No invite code provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/invites/${code}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid invite');
          return;
        }

        setInvite(data);
      } catch {
        setError('Failed to load invite');
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [code]);

  const handleAccept = async () => {
    if (!code) return;

    const token = getToken();
    if (!token) {
      // Store invite code and redirect to auth
      sessionStorage.setItem('pendingInvite', code);
      router.push(`${API_URL}/auth/github`);
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/invites/${code}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invite');
        return;
      }

      setAccepted(true);
      // Redirect to dashboard after a short delay
      setTimeout(() => router.push('/app'), 2000);
    } catch {
      setError('Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  // Check for pending invite after auth
  useEffect(() => {
    const pendingInvite = sessionStorage.getItem('pendingInvite');
    if (pendingInvite && user && !authLoading && pendingInvite === code) {
      sessionStorage.removeItem('pendingInvite');
      handleAccept();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, code]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Welcome to the team!</h1>
          <p className="text-text-secondary">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-2">Invite Error</h1>
            <p className="text-text-secondary mb-6">{error}</p>
            <a
              href="/"
              className="inline-block bg-text-primary text-bg-base px-6 py-2 rounded-sm font-medium hover:translate-y-[-1px] transition-all"
            >
              Go Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!invite) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">recall</h1>
          </div>

          {/* Invite Info */}
          <div className="text-center mb-8">
            <p className="text-text-tertiary mb-2">You&apos;ve been invited to join</p>
            <h2 className="text-2xl font-bold text-text-primary">{invite.teamName}</h2>
            <p className="text-text-secondary mt-2">
              Invited by <span className="text-text-primary">{invite.invitedBy}</span>
            </p>
          </div>

          {/* Role Badge */}
          <div className="flex justify-center mb-8">
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm">
              {invite.role === 'admin' ? 'Admin' : 'Team Member'}
            </span>
          </div>

          {/* User Status */}
          {user ? (
            <div className="mb-6 p-4 bg-bg-base border border-border-subtle rounded-lg">
              <div className="flex items-center gap-3">
                {user.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || user.email}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="text-text-primary font-medium">{user.name || user.email}</p>
                  <p className="text-text-tertiary text-sm">{user.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-text-secondary text-sm text-center mb-6">
              You&apos;ll need to sign in with GitHub to accept this invite.
            </p>
          )}

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full bg-text-primary text-bg-base py-3 rounded-sm font-medium hover:translate-y-[-1px] hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? 'Joining...' : user ? 'Accept Invite' : 'Sign in & Accept'}
          </button>

          {/* Expiry Notice */}
          <p className="text-text-tertiary text-xs text-center mt-6">
            This invite expires {new Date(invite.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}
