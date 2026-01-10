'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.recall.team';

function ConnectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Check if we have plan data
    const planData = localStorage.getItem('signup_plan');
    if (!planData) {
      router.push('/signup/plan');
      return;
    }

    // If user is already logged in, go to team setup
    if (!loading && user) {
      router.push('/signup/team');
    }
  }, [router, loading, user]);

  const handleGitHubConnect = () => {
    // Store that we're in signup flow
    localStorage.setItem('signup_flow', 'true');

    const redirectUri = `${window.location.origin}/auth/callback?signup=true`;
    window.location.href = `${API_URL}/auth/github?redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  if (loading) {
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
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
          <a href="/" className="font-semibold text-xl text-text-primary">recall</a>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-12">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="w-12 h-0.5 bg-green-500" />
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="w-12 h-0.5 bg-cyan-500" />
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white text-sm font-bold">3</div>
            <div className="w-12 h-0.5 bg-border-subtle" />
            <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center text-text-tertiary text-sm">4</div>
          </div>

          <h1 className="text-3xl font-bold text-text-primary text-center mb-2">Connect GitHub</h1>
          <p className="text-text-secondary text-center mb-12">We need GitHub access to store memory in your repos.</p>

          <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 mb-8">
            <h2 className="text-text-primary font-semibold mb-4">What we'll access:</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-text-secondary">
                <svg className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Read and write to the <code className="px-1.5 py-0.5 bg-bg-base rounded text-cyan-400 text-sm">.recall/</code> folder in your repos</span>
              </li>
              <li className="flex items-start gap-3 text-text-secondary">
                <svg className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Your email address for account communication</span>
              </li>
              <li className="flex items-start gap-3 text-text-secondary">
                <svg className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>List of repositories you have access to</span>
              </li>
            </ul>
          </div>

          <div className="bg-bg-elevated border border-green-500/30 rounded-xl p-6 mb-8">
            <h2 className="text-green-400 font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              What we don't access:
            </h2>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-text-secondary">
                <span className="text-green-400">x</span>
                Your source code (only .recall/ folder)
              </li>
              <li className="flex items-center gap-2 text-text-secondary">
                <span className="text-green-400">x</span>
                Private keys or secrets
              </li>
              <li className="flex items-center gap-2 text-text-secondary">
                <span className="text-green-400">x</span>
                CI/CD workflows or Actions
              </li>
            </ul>
          </div>

          <button
            onClick={handleGitHubConnect}
            className="w-full flex items-center justify-center gap-3 py-4 bg-text-primary text-bg-base rounded-lg font-semibold hover:translate-y-[-1px] hover:shadow-lg transition-all"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            Connect GitHub
          </button>

          <p className="text-center text-text-tertiary text-sm mt-6">
            By connecting, you agree to our{' '}
            <a href="/terms" className="text-cyan-400 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-cyan-400 hover:underline">Privacy Policy</a>
          </p>
        </motion.div>
      </main>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConnectContent />
    </Suspense>
  );
}
