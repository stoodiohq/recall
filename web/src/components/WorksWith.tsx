'use client';

import { motion } from 'framer-motion';

const tools = [
  { name: 'Claude Code', description: 'Anthropic' },
  { name: 'Cursor', description: 'AI-first editor' },
  { name: 'Codex', description: 'OpenAI' },
  { name: 'Gemini CLI', description: 'Google' },
];

export function WorksWith() {
  return (
    <section className="py-section px-6 bg-bg-elevated">
      <div className="max-w-5xl mx-auto text-center">
        <motion.h2
          className="text-h1 text-text-primary mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Works with the tools you already use.
        </motion.h2>

        <motion.p
          className="text-body-lg text-text-secondary mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Automatic extraction from all major AI coding assistants.
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {tools.map((tool, index) => (
            <motion.div
              key={tool.name}
              className="bg-bg-base border border-border-subtle rounded-lg p-6 hover:border-border-visible transition-colors"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="w-12 h-12 bg-bg-hover rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-text-primary">
                  {tool.name.charAt(0)}
                </span>
              </div>
              <h3 className="text-h3 text-text-primary mb-1">{tool.name}</h3>
              <p className="text-sm text-text-muted">{tool.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="text-text-muted mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          More coming soon.
        </motion.p>
      </div>
    </section>
  );
}
