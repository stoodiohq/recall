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
          <a href="/docs" className="text-text-secondary hover:text-text-primary transition-colors">
            Docs
          </a>
          <a href="/pricing" className="text-text-secondary hover:text-text-primary transition-colors">
            Pricing
          </a>
          <a href="https://github.com/stoodiohq/recall" className="text-text-secondary hover:text-text-primary transition-colors">
            GitHub
          </a>

          {loading ? (
            <div className="w-8 h-8 rounded-full bg-border-subtle animate-pulse" />
          ) : user ? (
            <>
              <a href="/app" className="text-text-secondary hover:text-text-primary transition-colors">
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
                href="/login"
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Login
              </a>
              <a
                href="/signup"
                className="bg-text-primary text-bg-base px-4 py-2 rounded-sm font-semibold hover:translate-y-[-1px] hover:shadow-lg hover:shadow-white/10 transition-all"
              >
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
