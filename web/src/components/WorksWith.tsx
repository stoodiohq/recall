'use client';

import { motion } from 'framer-motion';

const tools = [
  {
    name: 'Claude Code',
    company: 'Anthropic',
    status: 'live',
    // Anthropic logo - orange/coral colored abstract logo
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
        <path d="M17.5 3.5L12 21L6.5 3.5H10L12 10.5L14 3.5H17.5Z" fill="#D97757"/>
        <path d="M6.5 3.5L12 21L6.5 3.5Z" fill="#D97757"/>
      </svg>
    ),
  },
  {
    name: 'Cursor',
    company: 'Anysphere',
    status: 'coming',
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="16" height="16" rx="2" className="text-text-muted"/>
      </svg>
    ),
  },
  {
    name: 'Windsurf',
    company: 'Codeium',
    status: 'coming',
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 12C4 8 8 4 12 4C16 4 20 8 20 12" stroke="currentColor" strokeWidth="2" fill="none" className="text-text-muted"/>
      </svg>
    ),
  },
  {
    name: 'Codex CLI',
    company: 'OpenAI',
    status: 'coming',
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="8" className="text-text-muted"/>
      </svg>
    ),
  },
  {
    name: 'Gemini CLI',
    company: 'Google',
    status: 'coming',
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4L4 12L12 20L20 12L12 4Z" className="text-text-muted"/>
      </svg>
    ),
  },
];

export function WorksWith() {
  return (
    <section className="py-section px-6">
      <div className="max-w-5xl mx-auto text-center">
        <motion.h2
          className="text-h1 text-text-primary mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Works with your AI tools
        </motion.h2>

        <motion.p
          className="text-body-lg text-text-secondary mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Start with Claude Code today. More integrations shipping soon.
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {tools.map((tool, index) => (
            <motion.div
              key={tool.name}
              className={`relative rounded-lg p-6 transition-colors ${
                tool.status === 'live'
                  ? 'bg-accent/10 border-2 border-accent'
                  : 'bg-bg-base border border-border-subtle opacity-60'
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              {tool.status === 'live' && (
                <div className="absolute -top-2 -right-2 bg-accent text-bg-base text-xs font-bold px-2 py-0.5 rounded-full">
                  LIVE
                </div>
              )}
              {tool.status === 'coming' && (
                <div className="absolute -top-2 -right-2 bg-bg-hover text-text-muted text-xs font-medium px-2 py-0.5 rounded-full border border-border-subtle">
                  Soon
                </div>
              )}
              <div className="flex justify-center mb-3">
                {tool.logo}
              </div>
              <h3 className={`text-sm font-semibold mb-1 ${tool.status === 'live' ? 'text-text-primary' : 'text-text-muted'}`}>
                {tool.name}
              </h3>
              <p className="text-xs text-text-muted">{tool.company}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
