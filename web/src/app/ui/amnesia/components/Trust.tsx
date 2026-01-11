'use client';

import { motion } from 'framer-motion';

const trustPoints = [
  {
    text: 'Memory lives in YOUR GitHub repo',
    emphasis: 'YOUR',
  },
  {
    text: 'End-to-end encrypted (we can\'t read it)',
    emphasis: null,
  },
  {
    text: 'We process sessions, push to your repo, then delete',
    emphasis: null,
  },
  {
    text: 'Nothing stored on our servers except encryption keys',
    emphasis: null,
  },
  {
    text: 'Delete your repo = delete your data',
    emphasis: null,
  },
];

export function Trust() {
  return (
    <section className="am-section bg-[var(--am-bg-surface)]">
      <div className="am-container max-w-[800px]">
        {/* Headline */}
        <motion.h2
          className="am-text-display text-[var(--am-text-primary)] text-center mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Your repo. Your data. We just process and delete.
        </motion.h2>

        {/* Subheadline */}
        <motion.p
          className="am-text-body-lg text-[var(--am-text-secondary)] text-center mb-12 max-w-[640px] mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          When a session ends, Recall summarizes it, encrypts the result, and pushes to your repo. The raw session is deleted immediately.
        </motion.p>

        {/* Trust points box */}
        <motion.div
          className="am-card p-8 mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="space-y-5">
            {trustPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-4">
                <svg
                  className="w-6 h-6 text-[var(--am-terminal-green)] flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-[var(--am-text-primary)] text-[15px]">
                  {point.emphasis ? (
                    <>
                      {point.text.split(point.emphasis)[0]}
                      <span className="text-[var(--am-amber)] font-semibold">{point.emphasis}</span>
                      {point.text.split(point.emphasis)[1]}
                    </>
                  ) : (
                    point.text
                  )}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Enterprise callout */}
        <motion.div
          className="rounded-xl p-6 border border-[var(--am-border-glow)]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <h3 className="am-text-mono text-lg font-semibold text-[var(--am-text-primary)] mb-2">
            Need tighter control?
          </h3>
          <p className="text-[var(--am-text-secondary)] text-[15px]">
            Enterprise teams bring their own LLM key. Summarization happens on your infrastructure - nothing touches Recall servers.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
