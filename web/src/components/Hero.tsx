'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Terminal } from './Terminal';
import { getGitHubAuthUrl } from '@/lib/auth';
import { getHeroVariant, heroVariants, type HeroVariant } from '@/lib/ab-testing';

export function Hero() {
  const authUrl = getGitHubAuthUrl();
  const [variant, setVariant] = useState<HeroVariant>('A');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const v = getHeroVariant();
    setVariant(v);
    setIsLoaded(true);
  }, []);

  const copy = heroVariants[variant];

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-16">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          className="inline-block mb-6 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="text-cyan-400 text-sm font-medium">The first team memory layer for AI coding tools</span>
        </motion.div>

        <motion.h1
          className="text-display text-text-primary mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {copy.headline}
          <br />
          <span className="text-text-secondary">{copy.headlineLine2}</span>
        </motion.h1>

        <motion.p
          className="text-body-lg text-text-secondary mb-4 max-w-xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {copy.subhead}
        </motion.p>

        <motion.p
          className="text-body-lg text-text-primary mb-10 max-w-xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {copy.solution}
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <a
            href={authUrl}
            className="group relative bg-text-primary text-bg-base px-8 py-4 rounded-sm font-semibold text-lg hover:translate-y-[-2px] hover:shadow-xl hover:shadow-white/20 transition-all flex items-center gap-3"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            Start Trial
          </a>
          <a
            href="/docs"
            className="px-8 py-4 rounded-sm font-semibold text-lg text-text-primary hover:text-text-secondary transition-colors"
          >
            View Docs
          </a>
        </motion.div>

        <motion.div
          className="mt-8 flex items-center justify-center gap-2 text-text-muted text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Works with Claude Code</span>
          <span className="text-text-tertiary mx-2">|</span>
          <span className="text-text-tertiary">Cursor, Windsurf, Codex CLI coming soon</span>
        </motion.div>
      </div>

      <motion.div
        className="w-full max-w-4xl mx-auto mt-16"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <Terminal />
      </motion.div>
    </section>
  );
}
