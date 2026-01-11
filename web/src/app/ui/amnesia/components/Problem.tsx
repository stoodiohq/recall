'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const painPoints = [
  {
    title: 'Re-explaining context',
    quote: '"We use JWT, not sessions, because..."',
    frequency: 'Every session',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    title: 'Re-making mistakes',
    quote: '"localStorage breaks Safari private mode"',
    frequency: 'Every sprint',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    title: 'Re-litigating decisions',
    quote: '"Why did we choose Stripe?"',
    frequency: 'Every month',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

function AnimatedCounter({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isInView && !hasAnimated.current) {
      hasAnimated.current = true;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out curve
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(easeOut * end));

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(end);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [isInView, end, duration]);

  return <span ref={ref}>{count}</span>;
}

export function Problem() {
  return (
    <section className="am-section bg-[var(--am-bg-void)]">
      <div className="am-container max-w-[1120px]">
        {/* Headline with counter */}
        <motion.h2
          className="am-text-display text-[var(--am-text-primary)] text-center mb-4 max-w-[800px] mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Every day, your team loses{' '}
          <span className="text-[var(--am-amber)]">
            <AnimatedCounter end={47} /> hours
          </span>{' '}
          to forgotten context.
        </motion.h2>

        <motion.p
          className="am-text-body-lg text-[var(--am-text-secondary)] text-center mb-16 max-w-[600px] mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          That&apos;s thousands of dollars per developer, every year.
        </motion.p>

        {/* Pain point cards */}
        <div className="am-grid-3 max-w-[1024px] mx-auto">
          {painPoints.map((point, index) => (
            <motion.div
              key={point.title}
              className="am-card p-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: 0.1 * (index + 1),
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-[rgba(239,68,68,0.1)] flex items-center justify-center mb-4 text-[#EF4444]">
                {point.icon}
              </div>

              {/* Title */}
              <h3 className="am-text-mono text-lg font-semibold text-[var(--am-text-primary)] mb-3">
                {point.title}
              </h3>

              {/* Quote */}
              <p className="text-[var(--am-text-secondary)] text-[15px] italic mb-6">
                {point.quote}
              </p>

              {/* Frequency */}
              <p className="text-[var(--am-amber)] text-sm font-medium uppercase tracking-wider">
                {point.frequency}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
