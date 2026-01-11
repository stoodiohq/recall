'use client';

import { motion } from 'framer-motion';

export function Product() {
  return (
    <section className="py-section px-6">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          className="text-h1 text-text-primary text-center mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          It&apos;s just markdown in your repo.
        </motion.h2>

        <motion.p
          className="text-body-lg text-text-secondary text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          No proprietary formats. No vendor lock-in. Your data, your repo.
        </motion.p>

        <motion.div
          className="bg-bg-elevated border border-border-subtle rounded-lg p-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="font-mono text-code">
            <div className="text-text-muted mb-2">acme/app/</div>
            <div className="ml-4 text-text-secondary">├── .git/</div>
            <div className="ml-4 text-accent">├── .recall/</div>
            <div className="ml-8 text-text-secondary">
              ├── <span className="text-text-primary">context.md</span>
              <span className="text-text-muted ml-4">Team brain (~1.5-3k tokens)</span>
            </div>
            <div className="ml-8 text-text-secondary">
              ├── <span className="text-text-primary">history.md</span>
              <span className="text-text-muted ml-4">Encyclopedia (~30k tokens)</span>
            </div>
            <div className="ml-8 text-text-secondary">
              └── <span className="text-text-primary">sessions/</span>
              <span className="text-text-muted ml-4">Full transcripts (~1.5k each)</span>
            </div>
            <div className="ml-4 text-text-secondary">├── src/</div>
            <div className="ml-4 text-text-secondary">└── package.json</div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8 mt-12">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3 className="text-h3 text-text-primary mb-2">Human-readable</h3>
            <p className="text-body text-text-secondary">Open it in any editor.</p>
          </motion.div>
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 className="text-h3 text-text-primary mb-2">Git-diffable</h3>
            <p className="text-body text-text-secondary">See what changed.</p>
          </motion.div>
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h3 className="text-h3 text-text-primary mb-2">No lock-in</h3>
            <p className="text-body text-text-secondary">It&apos;s your data.</p>
          </motion.div>
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h3 className="text-h3 text-text-primary mb-2">Zero maintenance</h3>
            <p className="text-body text-text-secondary">No files to maintain manually.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
