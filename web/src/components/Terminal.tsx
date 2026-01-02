'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

interface Line {
  type: 'prompt' | 'output' | 'highlight';
  text: string;
  delay: number;
}

const lines: Line[] = [
  { type: 'prompt', text: '$ git clone git@github.com:acme/app.git', delay: 0 },
  { type: 'output', text: 'Cloning into \'app\'...', delay: 800 },
  { type: 'output', text: 'Receiving objects: 100%', delay: 1200 },
  { type: 'output', text: '', delay: 1400 },
  { type: 'prompt', text: '$ cd app && ls -la', delay: 1800 },
  { type: 'output', text: '.git/', delay: 2200 },
  { type: 'highlight', text: '.recall/          ← team memory', delay: 2400 },
  { type: 'output', text: 'src/', delay: 2600 },
  { type: 'output', text: 'package.json', delay: 2700 },
  { type: 'output', text: '', delay: 2900 },
  { type: 'prompt', text: '$ cat .recall/small.md', delay: 3300 },
  { type: 'output', text: '# Team Context', delay: 3700 },
  { type: 'output', text: '- Auth uses Supabase (decision: Nov 3, @devon)', delay: 3900 },
  { type: 'output', text: '- Don\'t use moment.js - broke build (failure: Nov 5)', delay: 4100 },
  { type: 'output', text: '- API rate limiting: 100/min (prod constraint)', delay: 4300 },
  { type: 'output', text: '', delay: 4500 },
  { type: 'prompt', text: '$ claude "how does auth work here?"', delay: 5000 },
  { type: 'output', text: 'Based on your team\'s context, auth uses Supabase...', delay: 5600 },
];

export function Terminal() {
  const [visibleLines, setVisibleLines] = useState<number>(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    lines.forEach((line, index) => {
      const timer = setTimeout(() => {
        setVisibleLines(index + 1);
      }, line.delay);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-lg overflow-hidden shadow-2xl">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-bg-hover border-b border-border-subtle">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
        </div>
        <span className="text-text-muted text-sm ml-2 font-mono">terminal</span>
      </div>

      {/* Terminal content */}
      <div className="p-4 font-mono text-code min-h-[400px]">
        <AnimatePresence mode="popLayout">
          {lines.slice(0, visibleLines).map((line, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={clsx(
                'whitespace-pre',
                line.type === 'prompt' && 'text-text-primary',
                line.type === 'output' && 'text-text-secondary',
                line.type === 'highlight' && 'text-accent animate-pulse-glow inline-block'
              )}
            >
              {line.type === 'prompt' && (
                <span className="text-success">$ </span>
              )}
              {line.type === 'prompt' ? line.text.slice(2) : line.text}
              {line.text === '' && <br />}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Blinking cursor */}
        {visibleLines === lines.length && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="inline-block w-2 h-5 bg-text-primary ml-1 align-middle"
          />
        )}
      </div>
    </div>
  );
}
