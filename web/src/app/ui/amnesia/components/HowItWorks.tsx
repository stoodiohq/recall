'use client';

import { motion } from 'framer-motion';

const steps = [
  {
    number: 1,
    title: 'Connect GitHub',
    description: 'OAuth in, pick your repos. We create the .recall/ folder.',
  },
  {
    number: 2,
    title: 'Add the MCP',
    description: 'One command in your terminal. Works with Claude Code.',
  },
  {
    number: 3,
    title: 'Just code',
    description: 'That\'s it. Recall runs automatically at session end.',
  },
];

export function HowItWorks() {
  return (
    <section className="am-section bg-[var(--am-bg-void)]">
      <div className="am-container max-w-[1024px]">
        {/* Headline */}
        <motion.h2
          className="am-text-display text-[var(--am-text-primary)] text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          5 minutes to set up. Then forget about it.
        </motion.h2>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <motion.div
            className="hidden md:block absolute top-7 left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] h-0.5 z-0"
            style={{
              background: 'linear-gradient(90deg, var(--am-amber) 0%, var(--am-border-visible) 50%, var(--am-amber) 100%)',
            }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />

          <div className="am-grid-3 gap-12 md:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                className="text-center relative z-10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.6,
                  delay: 0.15 * index,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {/* Number circle */}
                <div
                  className="w-14 h-14 rounded-full bg-[var(--am-amber)] text-[var(--am-bg-void)] flex items-center justify-center mx-auto mb-6"
                  style={{
                    boxShadow: '0 0 0 8px rgba(245, 158, 11, 0.15)',
                  }}
                >
                  <span className="am-text-mono text-2xl font-bold">{step.number}</span>
                </div>

                {/* Title */}
                <h3 className="am-text-mono text-lg font-semibold text-[var(--am-text-primary)] mb-3">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-[var(--am-text-secondary)] text-[15px] max-w-[240px] mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer text */}
        <motion.p
          className="text-center text-[var(--am-text-muted)] mt-16 text-[15px]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          No commands to remember. No files to update.
          <br />
          Your <span className="am-text-mono text-[var(--am-amber)]">.recall/</span> folder syncs with your repo - context travels with your code.
        </motion.p>
      </div>
    </section>
  );
}
