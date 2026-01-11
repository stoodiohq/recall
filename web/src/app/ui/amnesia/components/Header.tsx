'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 48);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 h-16 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[rgba(10,10,11,0.85)] backdrop-blur-xl border-b border-[var(--am-border-subtle)]'
          : 'bg-transparent'
      }`}
    >
      <div className="am-container h-full flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/ui/amnesia"
          className="font-['JetBrains_Mono'] text-xl font-semibold text-[var(--am-text-primary)] tracking-tight hover:opacity-80 transition-opacity"
        >
          recall
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="#"
            className="text-[15px] font-medium text-[var(--am-text-secondary)] hover:text-[var(--am-text-primary)] transition-colors"
          >
            Docs
          </Link>
          <Link
            href="#pricing"
            className="text-[15px] font-medium text-[var(--am-text-secondary)] hover:text-[var(--am-text-primary)] transition-colors"
          >
            Pricing
          </Link>
          <a
            href="https://github.com/goldfish/recall"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[15px] font-medium text-[var(--am-text-secondary)] hover:text-[var(--am-text-primary)] transition-colors"
          >
            GitHub
          </a>
          <Link href="#" className="am-btn-primary !h-10 !px-5 !text-[15px]">
            Start Trial
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-[var(--am-text-primary)]"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {mobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          className="md:hidden fixed inset-0 top-16 bg-[var(--am-bg-void)] z-40"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <nav className="flex flex-col p-6 gap-4">
            <Link
              href="#"
              className="text-lg font-medium text-[var(--am-text-secondary)] hover:text-[var(--am-text-primary)] py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Docs
            </Link>
            <Link
              href="#pricing"
              className="text-lg font-medium text-[var(--am-text-secondary)] hover:text-[var(--am-text-primary)] py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <a
              href="https://github.com/goldfish/recall"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-medium text-[var(--am-text-secondary)] hover:text-[var(--am-text-primary)] py-2"
            >
              GitHub
            </a>
            <Link
              href="#"
              className="am-btn-primary mt-4"
              onClick={() => setMobileMenuOpen(false)}
            >
              Start Trial
            </Link>
          </nav>
        </motion.div>
      )}
    </header>
  );
}
