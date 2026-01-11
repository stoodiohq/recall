'use client';

import { motion } from 'framer-motion';

const dataHandling = [
  { weHandle: 'Summarization processing', youOwn: 'All context files' },
  { weHandle: 'Encryption keys (per team)', youOwn: 'Your repository' },
  { weHandle: 'Team authentication', youOwn: 'Session history' },
];

export function TrustSecurity() {
  return (
    <section className="py-section px-6 bg-bg-elevated">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          className="text-h1 text-text-primary text-center mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Your repo. Your data. We just process and delete.
        </motion.h2>

        <motion.p
          className="text-body-lg text-text-secondary text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          When a session ends, Recall summarizes it, encrypts the result with your team&apos;s key, and pushes to your repo. The raw session is deleted immediately. We never store your code or context.
        </motion.p>

        <motion.div
          className="bg-bg-base border border-border-subtle rounded-lg overflow-hidden mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left p-4 text-text-muted font-medium">We handle</th>
                <th className="text-left p-4 text-text-muted font-medium">You own</th>
              </tr>
            </thead>
            <tbody>
              {dataHandling.map((row, index) => (
                <tr key={index} className="border-b border-border-subtle last:border-b-0">
                  <td className="p-4 text-text-secondary">{row.weHandle}</td>
                  <td className="p-4 text-text-primary font-medium">{row.youOwn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <motion.p
          className="text-body text-text-muted text-center mb-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          Only authenticated team members with active seats can decrypt. Everyone else sees encrypted markdown.
        </motion.p>

        <motion.div
          className="bg-bg-base border border-accent/30 rounded-lg p-6 mt-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="text-h3 text-text-primary mb-2">Need tighter control?</h3>
          <p className="text-body text-text-secondary">
            Enterprise teams bring their own LLM key. Summarization happens on your infrastructure - nothing touches Recall servers. For teams where &quot;trust us&quot; isn&apos;t enough.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
