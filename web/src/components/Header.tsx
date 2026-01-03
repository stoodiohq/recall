'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { useAuth } from '@/lib/AuthContext';
import { getGitHubAuthUrl } from '@/lib/auth';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300',
        scrolled ? 'bg-bg-base/90 backdrop-blur-md border-b border-border-subtle' : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="font-semibold text-xl text-text-primary">
          recall
        </a>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#pricing" className="text-text-secondary hover:text-text-primary transition-colors">
            Pricing
          </a>
          <a href="https://github.com/stoodiohq/recall" className="text-text-secondary hover:text-text-primary transition-colors">
            GitHub
          </a>

          {loading ? (
            <div className="w-8 h-8 rounded-full bg-border-subtle animate-pulse" />
          ) : user ? (
            <>
              <a href="/dashboard" className="text-text-secondary hover:text-text-primary transition-colors">
                Dashboard
              </a>
              <div className="flex items-center gap-3">
                {user.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || user.githubUsername}
                    className="w-8 h-8 rounded-full border border-border-subtle"
                  />
                )}
                <button
                  onClick={logout}
                  className="text-text-secondary hover:text-text-primary transition-colors text-sm"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <a
                href={getGitHubAuthUrl()}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Login
              </a>
              <a
                href={getGitHubAuthUrl()}
                className="bg-text-primary text-bg-base px-4 py-2 rounded-sm font-semibold hover:translate-y-[-1px] hover:shadow-lg hover:shadow-white/10 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                Get Started
              </a>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button className="md:hidden text-text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </div>
    </header>
  );
}
