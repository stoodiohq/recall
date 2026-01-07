'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.recall.team';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [status, setStatus] = useState<'loading' | 'initializing' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your subscription...');
  const [initProgress, setInitProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    const completeSetup = async () => {
      const sessionId = searchParams.get('session_id');

      if (!sessionId) {
        setStatus('error');
        setMessage('Missing session information. Please try again.');
        return;
      }

      try {
        // Give the webhook a moment to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Refresh user data to get the new team
        setMessage('Setting up your team...');
        await refresh();

        // Get the updated user with team info
        const token = getToken();
        const userResponse = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await userResponse.json();

        if (!userData.team) {
          // Webhook might still be processing, wait a bit more
          setMessage('Finalizing your subscription...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          await refresh();
        }

        // Fetch repos to initialize
        setStatus('initializing');
        setMessage('Initializing your repositories...');

        const reposResponse = await fetch(`${API_URL}/repos?enabled=true`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (reposResponse.ok) {
          const reposData = await reposResponse.json();
          const repos = reposData.repos || [];

          if (repos.length > 0) {
            setInitProgress({ current: 0, total: repos.length });

            for (let i = 0; i < repos.length; i++) {
              const repo = repos[i];
              setInitProgress({ current: i + 1, total: repos.length });

              try {
                await fetch(`${API_URL}/repos/${repo.id}/initialize`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                });
              } catch (err) {
                console.error(`Failed to initialize ${repo.fullName}:`, err);
              }
            }
          }
        }

        setStatus('success');
        setMessage('All set! Let\'s select your repositories...');

        // Final refresh and redirect to repos page
        await refresh();
        setTimeout(() => {
          router.push('/dashboard/repos?welcome=1');
        }, 1500);

      } catch (error) {
        console.error('Setup error:', error);
        setStatus('error');
        setMessage('Something went wrong. Please contact support.');
      }
    };

    completeSetup();
  }, [searchParams, refresh, router]);

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <h1 className="text-2xl font-bold text-text-primary mb-2">Payment Successful!</h1>
            <p className="text-text-secondary">{message}</p>
          </>
        )}

        {status === 'initializing' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <h1 className="text-2xl font-bold text-text-primary mb-2">Setting Up Recall</h1>
            <p className="text-text-secondary mb-4">{message}</p>
            {initProgress && (
              <div className="w-full bg-bg-elevated rounded-full h-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(initProgress.current / initProgress.total) * 100}%` }}
                />
              </div>
            )}
            {initProgress && (
              <p className="text-sm text-text-tertiary mt-2">
                {initProgress.current} of {initProgress.total} repositories
              </p>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">You&apos;re All Set!</h1>
            <p className="text-text-secondary">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Something Went Wrong</h1>
            <p className="text-text-secondary mb-6">{message}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <h1 className="text-2xl font-bold text-text-primary mb-2">Loading...</h1>
      </div>
    </div>
  );
}

export default function OnboardingSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuccessContent />
    </Suspense>
  );
}
