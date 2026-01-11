'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TerminalLine {
  type: 'prompt' | 'output' | 'highlight' | 'empty' | 'context';
  text: string;
  delay: number;
}

const beforeLines: TerminalLine[] = [
  { type: 'prompt', text: '$ claude "how does auth work here?"', delay: 0 },
  { type: 'empty', text: '', delay: 400 },
  { type: 'output', text: 'Based on the codebase, authentication uses...', delay: 800 },
  { type: 'empty', text: '', delay: 1000 },
  { type: 'output', text: '- JWT tokens stored in httpOnly cookies', delay: 1200 },
  { type: 'output', text: '- Refresh tokens rotate every 7 days', delay: 1400 },
  { type: 'output', text: '- Sessions tracked in Redis', delay: 1600 },
];

const afterLines: TerminalLine[] = [
  { type: 'prompt', text: '$ claude "how does auth work here?"', delay: 0 },
  { type: 'empty', text: '', delay: 300 },
  { type: 'context', text: '[context loaded: 47 team decisions, 12 lessons learned]', delay: 600 },
  { type: 'empty', text: '', delay: 800 },
  { type: 'output', text: 'Based on your team\'s context:', delay: 1000 },
  { type: 'empty', text: '', delay: 1200 },
  { type: 'highlight', text: '- Auth uses JWT + httpOnly cookies (decision: @sarah, Nov 3)', delay: 1400 },
  { type: 'highlight', text: '- Don\'t use localStorage (breaks Safari private - learned hard way)', delay: 1600 },
  { type: 'highlight', text: '- Refresh tokens rotate every 7d (matched Stripe\'s pattern)', delay: 1800 },
  { type: 'highlight', text: '- Rate limit: 100 auth/min (prod constraint)', delay: 2000 },
];

const PHASE_DURATIONS = {
  NORMAL: 3000,      // Show normal state
  DISSOLVE: 1500,    // Dissolving animation
  PAUSE: 1000,       // Empty pause
  CONTEXT: 500,      // Context loading text
  RECONSTRUCT: 2500, // Reconstruction with new content
  HOLD: 3500,        // Hold final state
};

export function Terminal() {
  const [phase, setPhase] = useState<'normal' | 'dissolving' | 'empty' | 'reconstructing' | 'complete'>('normal');
  const [visibleLines, setVisibleLines] = useState<TerminalLine[]>([]);
  const [showCursor, setShowCursor] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Type out lines sequentially
  const typeLines = (lines: TerminalLine[], onComplete?: () => void) => {
    let currentIndex = 0;
    setVisibleLines([]);

    const showNext = () => {
      if (currentIndex < lines.length) {
        const line = lines[currentIndex];
        setTimeout(() => {
          setVisibleLines(prev => [...prev, line]);
          currentIndex++;
          showNext();
        }, line.delay);
      } else if (onComplete) {
        onComplete();
      }
    };

    showNext();
  };

  // Animation loop
  useEffect(() => {
    const runAnimation = () => {
      // Phase 1: Normal
      setPhase('normal');
      setIsActive(false);
      typeLines(beforeLines, () => {
        // Wait then dissolve
        timerRef.current = setTimeout(() => {
          // Phase 2: Dissolving
          setPhase('dissolving');

          timerRef.current = setTimeout(() => {
            // Phase 3: Empty
            setPhase('empty');
            setVisibleLines([]);

            timerRef.current = setTimeout(() => {
              // Phase 4: Reconstructing
              setPhase('reconstructing');
              setIsActive(true);
              typeLines(afterLines, () => {
                // Phase 5: Complete/Hold
                setPhase('complete');

                timerRef.current = setTimeout(() => {
                  // Restart
                  runAnimation();
                }, PHASE_DURATIONS.HOLD);
              });
            }, PHASE_DURATIONS.PAUSE);
          }, PHASE_DURATIONS.DISSOLVE);
        }, PHASE_DURATIONS.NORMAL);
      });
    };

    runAnimation();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const getLineClass = (type: TerminalLine['type']) => {
    switch (type) {
      case 'prompt':
        return 'am-terminal-prompt';
      case 'output':
        return 'am-terminal-output';
      case 'highlight':
        return 'am-terminal-highlight';
      case 'context':
        return 'am-terminal-highlight text-sm opacity-70';
      case 'empty':
      default:
        return '';
    }
  };

  return (
    <div className={`am-terminal ${isActive ? 'am-terminal--active' : ''}`}>
      {/* Chrome */}
      <div className="am-terminal-chrome">
        <div className="am-traffic-lights">
          <div className="am-traffic-light am-traffic-light--close" />
          <div className="am-traffic-light am-traffic-light--minimize" />
          <div className="am-traffic-light am-traffic-light--maximize" />
        </div>
        <div className="am-terminal-title">terminal</div>
        <div style={{ width: 52 }} /> {/* Spacer for centering */}
      </div>

      {/* Body */}
      <div className="am-terminal-body">
        <AnimatePresence mode="wait">
          {phase === 'dissolving' ? (
            <motion.div
              key="dissolving"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0, filter: 'blur(4px)', y: -20 }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.6, 1] }}
            >
              {beforeLines.map((line, index) => (
                <div key={index} className={getLineClass(line.type)}>
                  {line.type === 'prompt' && <span className="am-terminal-prompt">$ </span>}
                  {line.type === 'prompt' ? line.text.replace('$ ', '') : line.text}
                </div>
              ))}
            </motion.div>
          ) : phase === 'empty' ? (
            <motion.div
              key="empty"
              className="flex items-center justify-center h-full text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-am-text-muted text-sm opacity-50">
                .recall/context.md loading...
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="lines"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {visibleLines.map((line, index) => (
                <motion.div
                  key={index}
                  className={getLineClass(line.type)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{ minHeight: line.type === 'empty' ? '24px' : 'auto' }}
                >
                  {line.type === 'prompt' && <span className="am-terminal-prompt">$ </span>}
                  {line.type === 'prompt' ? line.text.replace('$ ', '') : line.text}
                </motion.div>
              ))}
              {/* Cursor */}
              {(phase === 'complete' || phase === 'normal') && visibleLines.length > 0 && (
                <div className="mt-2">
                  <span
                    className="am-terminal-cursor"
                    style={{ opacity: showCursor ? 1 : 0 }}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
