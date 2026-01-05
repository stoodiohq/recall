'use client';

import { motion } from 'framer-motion';
import { clsx } from 'clsx';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '',
    description: 'For solo developers trying it out.',
    features: [
      '1 developer',
      '1 repository',
      '30 days history',
      'AI-powered summaries',
      'Works with any AI tool',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    id: 'team',
    name: 'Team',
    price: '$12',
    period: '/seat/mo',
    description: 'For dev teams who ship together.',
    features: [
      'Unlimited developers',
      'Unlimited repos',
      '1 year history',
      'Team analytics',
      'Encrypted sharing',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
    badge: 'Most Popular',
    annual: '$10/seat billed annually',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For orgs with compliance needs.',
    features: [
      'Everything in Team',
      'Unlimited history',
      'SSO / SAML',
      'BYOK (your own LLM)',
      'SLA & dedicated support',
      'On-prem available',
    ],
    cta: "Let's Talk",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-section px-6">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          className="text-h1 text-text-primary text-center mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Pricing
        </motion.h2>

        <motion.p
          className="text-body-lg text-text-secondary text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Simple pricing. Scale with your team.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              className={clsx(
                'relative bg-bg-elevated border rounded-lg p-6 flex flex-col',
                plan.highlighted
                  ? 'border-accent shadow-lg shadow-accent/10'
                  : 'border-border-subtle'
              )}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-bg-base text-sm font-semibold px-3 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}

              <h3 className="text-h3 text-text-primary mb-2">{plan.name}</h3>
              <div className="mb-2">
                <span className="text-4xl font-bold text-text-primary">{plan.price}</span>
                <span className="text-text-muted">{plan.period}</span>
              </div>
              {plan.annual && (
                <p className="text-sm text-accent mb-4">{plan.annual}</p>
              )}
              <p className="text-body text-text-secondary mb-6">{plan.description}</p>

              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-body text-text-secondary">
                    <svg className="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={`/checkout?plan=${plan.id}`}
                className={clsx(
                  'block text-center py-3 rounded-sm font-semibold transition-all',
                  plan.highlighted
                    ? 'bg-text-primary text-bg-base hover:translate-y-[-1px] hover:shadow-lg hover:shadow-white/15'
                    : 'border border-border-visible text-text-primary hover:border-text-muted'
                )}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="text-center text-text-muted mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Need more than 50 developers?{' '}
          <a href="mailto:enterprise@recall.team" className="text-accent hover:text-accent-hover">
            Let&apos;s talk.
          </a>
        </motion.p>
      </div>
    </section>
  );
}
