'use client';

import { motion } from 'framer-motion';

const examples = [
  {
    day: 'Monday',
    text: 'You explain your auth architecture to Claude.',
  },
  {
    day: 'Tuesday',
    text: 'Your teammate explains the same thing to their session.',
  },
  {
    day: 'Wednesday',
    text: 'New session. You explain it again.',
  },
];

export function Problem() {
  return (
    <section className="py-section px-6">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          className="text-h1 text-text-primary text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Your team keeps teaching AI the same things
        </motion.h2>

        <div className="space-y-4 mb-12">
          {examples.map((example, index) => (
            <motion.div
              key={example.day}
              className="flex items-start gap-4 bg-bg-elevated border border-border-subtle rounded-lg p-6"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <span className="text-accent font-semibold min-w-[100px]">{example.day}:</span>
              <span className="text-text-secondary">{example.text}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="bg-bg-elevated border border-border-subtle rounded-lg p-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <p className="text-text-secondary mb-4">
            Your senior devs carry context in their heads. When they&apos;re out, the AI is useless. When they leave, that knowledge walks out the door.
          </p>
          <p className="text-text-primary font-medium">
            The average developer spends 15-20% of every AI session on context setup. At $150/hour fully loaded, that&apos;s over $3,000 per developer per year - just on repetition.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
