'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export function FinalCTA() {
  const [copied, setCopied] = useState(false);
  const command = 'curl -fsSL https://recall.team/i | sh';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-section px-6 bg-bg-elevated">
      <div className="max-w-3xl mx-auto text-center">
        <motion.h2
          className="text-h1 text-text-primary mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          One command to get started.
        </motion.h2>

        <motion.div
          className="relative bg-bg-base border border-border-subtle rounded-lg p-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="font-mono text-code text-left flex items-center justify-between">
            <div>
              <span className="text-success">$ </span>
              <span className="text-text-primary">{command}</span>
            </div>
            <button
              onClick={handleCopy}
              className="ml-4 p-2 text-text-muted hover:text-text-primary transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-success">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                </svg>
              )}
            </button>
          </div>
          {copied && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm text-success"
            >
              Copied. Go paste it.
            </motion.div>
          )}
        </motion.div>

        <motion.a
          href="/signup"
          className="inline-block bg-text-primary text-bg-base px-8 py-4 rounded-sm font-semibold text-lg hover:translate-y-[-1px] hover:shadow-lg hover:shadow-white/15 transition-all"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Get Started
        </motion.a>
      </div>
    </section>
  );
}
