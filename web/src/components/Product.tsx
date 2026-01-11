'use client';

import { motion } from 'framer-motion';

const benefits = [
  {
    title: 'Automatic',
    description: 'No one has to remember to update anything.',
  },
  {
    title: 'Team-wide',
    description: 'Your teammate\'s learnings show up in your session.',
  },
  {
    title: 'Curated',
    description: 'AI extracts what matters - not a dump of everything.',
  },
];

export function Product() {
  return (
    <section className="py-section px-6 bg-bg-elevated">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          className="text-h1 text-text-primary text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          What one developer teaches, every AI session knows
        </motion.h2>

        <motion.div
          className="space-y-6 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <p className="text-body-lg text-text-secondary text-center">
            Recall runs silently in the background. When a session ends, it captures the important stuff - decisions made, patterns discovered, problems solved.
          </p>
          <p className="text-body-lg text-text-secondary text-center">
            Then it shares that context with your whole team.
          </p>
          <p className="text-body-lg text-text-primary text-center font-medium">
            Next session, any teammate&apos;s AI already knows. No copy-pasting. No &quot;let me explain our setup.&quot; It just has context.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              className="bg-bg-base border border-border-subtle rounded-lg p-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            >
              <h3 className="text-h3 text-accent mb-2">{benefit.title}</h3>
              <p className="text-body text-text-secondary">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
