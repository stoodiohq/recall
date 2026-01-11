'use client';

import { motion } from 'framer-motion';

export function FinalCTA() {
  return (
    <section className="am-section bg-[var(--am-bg-surface)]">
      <div className="am-container max-w-[800px] text-center">
        {/* Badge */}
        <motion.div
          className="am-badge mb-8 inline-flex"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          The first team memory layer for AI coding tools
        </motion.div>

        {/* Headline */}
        <motion.h2
          className="am-text-display text-[var(--am-text-primary)] mb-10 max-w-[640px] mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          Your team&apos;s AI should know what your team knows.
        </motion.h2>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <a href="#" className="am-btn-primary">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            Start Trial
          </a>
        </motion.div>

        {/* Mini terminal */}
        <motion.div
          className="max-w-[480px] mx-auto mt-12 rounded-lg bg-[var(--am-bg-void)] border border-[var(--am-border-visible)] p-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="am-text-code text-left">
            <p>
              <span className="text-[var(--am-terminal-green)]">$</span>{' '}
              <span className="text-[var(--am-text-primary)]">cat .recall/context.md</span>
            </p>
            <p className="text-[var(--am-text-secondary)] mt-2"># Team Context</p>
            <p className="text-[var(--am-text-secondary)]">- Auth uses Supabase (@devon, Nov 3)</p>
            <p className="text-[var(--am-text-secondary)]">- Don&apos;t use moment.js (breaks build)</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
