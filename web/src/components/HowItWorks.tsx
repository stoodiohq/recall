'use client';

import { motion } from 'framer-motion';

const steps = [
  {
    number: '1',
    title: 'Sign up and connect',
    description: 'Connect your GitHub repos.',
  },
  {
    number: '2',
    title: 'Add to your AI tool',
    description: 'Add Recall to your AI tool config.',
  },
  {
    number: '3',
    title: 'Code normally',
    description: 'That\'s it. Recall runs automatically at session end.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-section px-6">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          className="text-h1 text-text-primary text-center mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          5 minutes to set up. Then forget about it.
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8 mt-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              className="relative text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent text-bg-base text-xl font-bold mb-4">
                {step.number}
              </div>
              <h3 className="text-h3 text-text-primary mb-2">{step.title}</h3>
              <p className="text-body text-text-secondary">{step.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="text-body text-text-muted text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          No commands to remember. No files to update. Your <code className="text-accent">.recall/</code> folder syncs with your repo - context travels with your code.
        </motion.p>
      </div>
    </section>
  );
}
