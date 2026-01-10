'use client';

export const runtime = 'edge';

import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: {
    type: 'added' | 'improved' | 'fixed';
    items: string[];
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: 'January 10, 2026',
    title: 'Official Launch',
    description: 'Recall is now available! Your AI coding assistant finally remembers what your team has done.',
    changes: [
      {
        type: 'added',
        items: [
          'MCP Server integration for Claude Code, Cursor, and Windsurf',
          'Automatic session capture and summarization',
          'Team memory stored in your GitHub repositories',
          'Three-tier memory system: context (quick), history (detailed), sessions (complete)',
          'Value extraction: decisions, failures, lessons, and prompt patterns',
          'Team dashboard with activity feed and stats',
          'Member management with roles (Owner, Admin, Developer)',
          'Invite links for easy team onboarding',
        ],
      },
    ],
  },
  {
    version: '0.9.0',
    date: 'January 8, 2026',
    title: 'Enterprise Features',
    description: 'Added support for enterprise customers who need to bring their own LLM keys.',
    changes: [
      {
        type: 'added',
        items: [
          'BYOK (Bring Your Own Key) for Enterprise plan',
          'Encrypted API key storage with AES-256-GCM',
          'Support for OpenAI and Anthropic keys',
          'Key testing and validation before saving',
          'Enterprise billing with annual pricing',
        ],
      },
    ],
  },
  {
    version: '0.8.0',
    date: 'January 5, 2026',
    title: 'Billing & Subscriptions',
    description: 'Stripe integration for subscription management.',
    changes: [
      {
        type: 'added',
        items: [
          '14-day free trial for all new teams',
          'Monthly and annual billing options',
          'Team plan at $12/seat/month',
          'Enterprise plan at $30/seat/month',
          'Stripe customer portal for self-service',
          'Invoice history and PDF downloads',
        ],
      },
    ],
  },
  {
    version: '0.7.0',
    date: 'January 3, 2026',
    title: 'GitHub Integration',
    description: 'Memory files now live in your repositories.',
    changes: [
      {
        type: 'added',
        items: [
          'OAuth with GitHub for authentication',
          'Repository selection and enabling',
          '.recall/ directory structure in repos',
          'Automatic commits for session saves',
          'Context files versioned with your code',
        ],
      },
      {
        type: 'improved',
        items: [
          'Session saves now include structured metadata',
          'Memory files use clean markdown formatting',
        ],
      },
    ],
  },
  {
    version: '0.6.0',
    date: 'December 28, 2025',
    title: 'MCP Server',
    description: 'The core MCP server that powers everything.',
    changes: [
      {
        type: 'added',
        items: [
          'recall_get_context - Load team memory at session start',
          'recall_get_history - "remember" hotword for detailed context',
          'recall_get_transcripts - "ultraremember" for full encyclopedia',
          'recall_save_session - Save session with extracted value',
          'recall_log_decision - Quick capture of important decisions',
          'recall_status - Check connection status',
          'recall_init - Initialize Recall for a repository',
        ],
      },
    ],
  },
];

const typeStyles = {
  added: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    label: 'Added',
  },
  improved: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    label: 'Improved',
  },
  fixed: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    label: 'Fixed',
  },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      <Header />

      <main className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              Changelog
            </h1>
            <p className="text-text-secondary text-lg mb-12">
              New features, improvements, and fixes for Recall.
            </p>

            <div className="space-y-16">
              {changelog.map((entry, index) => (
                <motion.article
                  key={entry.version}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="relative"
                >
                  {/* Timeline line */}
                  {index < changelog.length - 1 && (
                    <div className="absolute left-[7px] top-[40px] bottom-[-48px] w-[2px] bg-border-subtle" />
                  )}

                  {/* Timeline dot */}
                  <div className="absolute left-0 top-[6px] w-4 h-4 rounded-full bg-text-primary" />

                  <div className="pl-10">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-sm font-mono text-text-tertiary">v{entry.version}</span>
                      <span className="text-sm text-text-tertiary">{entry.date}</span>
                    </div>

                    <h2 className="text-2xl font-semibold text-text-primary mb-2">
                      {entry.title}
                    </h2>

                    <p className="text-text-secondary mb-6">
                      {entry.description}
                    </p>

                    <div className="space-y-4">
                      {entry.changes.map((change, changeIndex) => {
                        const style = typeStyles[change.type];
                        return (
                          <div key={changeIndex}>
                            <span
                              className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${style.bg} ${style.border} ${style.text} border mb-3`}
                            >
                              {style.label}
                            </span>
                            <ul className="space-y-2">
                              {change.items.map((item, itemIndex) => (
                                <li
                                  key={itemIndex}
                                  className="flex items-start gap-3 text-text-secondary"
                                >
                                  <span className="text-text-tertiary mt-1.5">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
