'use client';

import { motion } from 'framer-motion';

const plans = [
  {
    id: 'team',
    name: 'Team',
    price: '$12',
    period: '/seat/month',
    description: 'For dev teams who ship together.',
    features: [
      'Unlimited repos',
      'Unlimited sessions',
      'AI-powered summaries',
      'Encrypted sharing',
      'We handle summarization',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
    badge: 'Most Popular',
    annual: '$10/seat billed annually',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$30',
    period: '/seat/month',
    description: 'For orgs with compliance needs.',
    features: [
      'Everything in Team',
      'Bring Your Own LLM Key',
      'Code never touches our servers',
      'SSO / SAML',
      'SLA & dedicated support',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
    annual: '$25/seat billed annually',
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="am-section bg-[var(--am-bg-void)]">
      <div className="am-container max-w-[920px]">
        {/* Headline */}
        <motion.h2
          className="am-text-display text-[var(--am-text-primary)] text-center mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Less than one hour of developer time. Saves dozens.
        </motion.h2>

        {/* Subheadline */}
        <motion.p
          className="am-text-body-lg text-[var(--am-text-secondary)] text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          14-day free trial. Cancel anytime.
        </motion.p>

        {/* Pricing cards */}
        <div className="am-grid-2 max-w-[720px] mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.highlighted
                  ? 'bg-[var(--am-bg-surface)] border border-[var(--am-amber)]'
                  : 'bg-[var(--am-bg-surface)] border border-[var(--am-border-visible)]'
              }`}
              style={
                plan.highlighted
                  ? { boxShadow: '0 0 32px rgba(245, 158, 11, 0.1)' }
                  : {}
              }
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: 0.1 * (index + 1),
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--am-amber)] text-[var(--am-bg-void)] text-xs font-semibold px-4 py-1 rounded-full uppercase tracking-wide">
                  {plan.badge}
                </div>
              )}

              {/* Plan name */}
              <h3 className="am-text-mono text-xl font-semibold text-[var(--am-text-primary)] mb-2">
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mb-2">
                <span className="text-5xl font-bold text-[var(--am-text-primary)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {plan.price}
                </span>
                <span className="text-[var(--am-text-muted)]">{plan.period}</span>
              </div>

              {/* Annual note */}
              <p className="text-sm text-[var(--am-amber)] mb-4">{plan.annual}</p>

              {/* Description */}
              <p className="text-[var(--am-text-secondary)] text-[15px] mb-6">{plan.description}</p>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-[var(--am-terminal-green)] flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[var(--am-text-secondary)] text-[15px]">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={`/checkout?plan=${plan.id}`}
                className={`block text-center py-4 rounded-lg font-semibold transition-all ${
                  plan.highlighted
                    ? 'bg-[var(--am-text-primary)] text-[var(--am-bg-void)] hover:translate-y-[-2px] hover:shadow-lg hover:shadow-white/15'
                    : 'border border-[var(--am-border-visible)] text-[var(--am-text-primary)] hover:border-[var(--am-text-muted)]'
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>

        {/* Enterprise contact */}
        <motion.p
          className="text-center text-[var(--am-text-muted)] mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Need 50+ seats?{' '}
          <a href="mailto:enterprise@recall.team" className="text-[var(--am-amber)] hover:underline">
            Let&apos;s talk.
          </a>
        </motion.p>
      </div>
    </section>
  );
}
