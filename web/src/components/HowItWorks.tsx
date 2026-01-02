'use client';

import { motion } from 'framer-motion';

const steps = [
  {
    number: '1',
    title: 'Install',
    description: 'One command to get started.',
    code: 'curl -fsSL https://recall.team/i | sh',
  },
  {
    number: '2',
    title: 'Work normally',
    description: 'Use Claude Code, Cursor, or any AI assistant. Sessions are captured automatically.',
    code: null,
  },
  {
    number: '3',
    title: 'Share via git',
    description: 'Push your code. Context goes with it. Teammates pull and their AI knows too.',
    code: 'git push',
  },
];

export function HowItWorks() {
  return (
    <section className="py-section px-6 bg-bg-elevated">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          className="text-h1 text-text-primary text-center mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Three commands. That&apos;s it.
        </motion.h2>

        <motion.p
          className="text-body-lg text-text-secondary text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          No complex setup. No configuration files. Just works.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              className="relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <div className="text-6xl font-bold text-border-visible mb-4">{step.number}</div>
              <h3 className="text-h3 text-text-primary mb-2">{step.title}</h3>
              <p className="text-body text-text-secondary mb-4">{step.description}</p>
              {step.code && (
                <div className="code-block">
                  <span className="prompt">$ </span>
                  <span className="text-text-primary">{step.code}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
