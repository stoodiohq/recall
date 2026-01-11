'use client';

import { motion } from 'framer-motion';

export function Demo() {
  return (
    <section className="am-section bg-[var(--am-bg-surface)]">
      <div className="am-container max-w-[1200px]">
        {/* Headline */}
        <motion.h2
          className="am-text-display text-[var(--am-text-primary)] text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          See what changes
        </motion.h2>

        {/* Comparison panels */}
        <div className="am-grid-2 max-w-[960px] mx-auto">
          {/* Before panel */}
          <motion.div
            className="rounded-xl overflow-hidden bg-[var(--am-bg-void)] border border-[var(--am-border-visible)]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="h-12 px-5 flex items-center bg-[var(--am-border-visible)] border-b border-[var(--am-border-visible)]">
              <span className="am-text-mono text-sm font-semibold text-[var(--am-text-muted)] uppercase tracking-wider">
                Before Recall
              </span>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* User message */}
              <div className="bg-[var(--am-border-visible)] rounded-lg p-4 mb-4">
                <p className="text-[var(--am-text-primary)] text-[15px]">
                  How should I handle auth in this project?
                </p>
              </div>

              {/* AI response */}
              <div className="py-3">
                <p className="text-[var(--am-text-secondary)] text-[15px] leading-relaxed">
                  There are several approaches to authentication. You could use JWT tokens, server-side sessions, or OAuth providers like Google or GitHub.
                </p>
                <p className="text-[var(--am-text-secondary)] text-[15px] leading-relaxed mt-3">
                  What are your requirements? Do you need social login, magic links, or password-based auth?
                </p>
              </div>
            </div>
          </motion.div>

          {/* After panel */}
          <motion.div
            className="rounded-xl overflow-hidden bg-[var(--am-bg-void)] border border-[var(--am-amber)]"
            style={{
              boxShadow: '0 0 32px rgba(245, 158, 11, 0.1)',
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="h-12 px-5 flex items-center bg-[var(--am-border-visible)] border-b border-[var(--am-border-visible)]">
              <span className="am-text-mono text-sm font-semibold text-[var(--am-amber)] uppercase tracking-wider">
                With Recall
              </span>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* User message */}
              <div className="bg-[var(--am-border-visible)] rounded-lg p-4 mb-4">
                <p className="text-[var(--am-text-primary)] text-[15px]">
                  How should I handle auth in this project?
                </p>
              </div>

              {/* AI response */}
              <div className="py-3">
                <p className="text-[var(--am-text-secondary)] text-[15px] leading-relaxed">
                  Based on <span className="text-[var(--am-amber)]">your team&apos;s context</span>, you&apos;re using Supabase with magic links. <span className="text-[var(--am-amber)]">@devon</span> set this up in November and documented the decision.
                </p>
                <p className="text-[var(--am-text-secondary)] text-[15px] leading-relaxed mt-3">
                  I see there&apos;s a known issue with token refresh in Safari - your teammate <span className="text-[var(--am-amber)]">@maya</span> ran into this last week. Check the context for the workaround.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
