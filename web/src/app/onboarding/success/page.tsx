'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
          router.push('/app/repos?welcome=1');
        }, 1500);

      } catch (error) {
        console.error('Setup error:', error);
        setStatus('error');
        setMessage('Something went wrong. Please contact support.');
      }
    };

    completeSetup();
  }, [searchParams, refresh, router]);

  // Determine if we should show spinner or static icon
  const showSpinner = status === 'loading' || status === 'initializing';
  const iconColor = status === 'error' ? 'red' : status === 'success' ? 'green' : 'cyan';

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8 text-center">
        {/* Icon container - consistent size to prevent layout shift */}
        <div className="w-16 h-16 mx-auto mb-6 relative">
          <AnimatePresence mode="wait">
            {showSpinner ? (
              <motion.div
                key="spinner"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"
              />
            ) : status === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center"
              >
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </motion.svg>
              </motion.div>
            ) : (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center"
              >
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Title - changes based on status */}
        <AnimatePresence mode="wait">
          <motion.h1
            key={status}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="text-2xl font-bold text-text-primary mb-2"
          >
            {status === 'loading' && 'Payment Successful!'}
            {status === 'initializing' && 'Setting Up Recall'}
            {status === 'success' && "You're All Set!"}
            {status === 'error' && 'Something Went Wrong'}
          </motion.h1>
        </AnimatePresence>

        {/* Message */}
        <motion.p
          key={message}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="text-text-secondary"
        >
          {message}
        </motion.p>

        {/* Progress bar - only during initialization */}
        <AnimatePresence>
          {status === 'initializing' && initProgress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4"
            >
              <div className="w-full bg-bg-elevated rounded-full h-2 overflow-hidden">
                <motion.div
                  className="bg-cyan-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(initProgress.current / initProgress.total) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-sm text-text-tertiary mt-2">
                {initProgress.current} of {initProgress.total} repositories
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error button */}
        <AnimatePresence>
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mt-6"
            >
              <button
                onClick={() => router.push('/app')}
                className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
              >
                Go to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
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
