'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const plans = [
  {
    id: 'team',
    name: 'Team',
    price: { monthly: 12, annual: 10 },
    description: 'For dev teams who ship together.',
    features: [
      'Unlimited repositories',
      'Unlimited sessions',
      'Full team memory',
      'Semantic search',
      'End-to-end encryption',
      'GitHub storage',
      'Claude Code support',
      'Email support',
    ],
    cta: 'Start 14-Day Trial',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: { monthly: 30, annual: 25 },
    description: 'For orgs with compliance needs.',
    features: [
      'Everything in Team',
      'Bring your own LLM key',
      'Code never touches our servers',
      'Your API, your control',
      'Priority support',
      'SSO / SAML',
      'Custom contracts available',
    ],
    cta: 'Start 14-Day Trial',
    highlighted: false,
    note: 'For teams with strict compliance requirements',
  },
];

const faqs = [
  {
    q: 'What counts as a "seat"?',
    a: 'Any team member who uses Recall to save sessions. Each seat gets a decryption token to access team memory.',
  },
  {
    q: 'Is there a free tier?',
    a: '14-day free trial with full features. After that, you need a paid seat to use Recall.',
  },
  {
    q: 'What happens to my data if I cancel?',
    a: 'Your .recall/ folder stays in your GitHub repo forever. You just can\'t add new sessions without an active subscription. Your existing memory files remain (encrypted, but yours).',
  },
  {
    q: 'Do you offer discounts for startups/students?',
    a: 'Yes. Email us at hello@recall.team.',
  },
  {
    q: 'What AI tools does Recall support?',
    a: 'Claude Code at launch. Cursor and other MCP-compatible tools coming soon after launch.',
  },
  {
    q: 'Is my code safe?',
    a: 'Team plan: We process sessions, push to your repo, then immediately delete. Nothing stored on our servers. Enterprise plan: Code never touches our servers at all. You bring your own LLM API key.',
  },
  {
    q: 'What if I need to add more seats later?',
    a: 'Add seats anytime from your dashboard. Your plan adjusts automatically. Prorated billing, no surprises.',
  },
];

function FAQItem({ q, a, isOpen, onClick }: { q: string; a: string; isOpen: boolean; onClick: () => void }) {
  return (
    <div className="border-b border-border-subtle">
      <button
        onClick={onClick}
        className="w-full py-5 flex items-center justify-between text-left"
      >
        <span className="text-text-primary font-medium pr-4">{q}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-text-tertiary flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-text-secondary pb-5">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-bg-base">
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <motion.h1
            className="text-5xl md:text-6xl font-bold text-text-primary mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Simple pricing. No surprises.
          </motion.h1>
          <motion.p
            className="text-xl text-text-secondary mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Start with a 14-day free trial. Cancel anytime.
          </motion.p>

          {/* Billing toggle */}
          <motion.div
            className="flex items-center justify-center gap-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className={clsx('text-sm', !annual ? 'text-text-primary' : 'text-text-tertiary')}>
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={clsx(
                'relative w-14 h-7 rounded-full transition-colors',
                annual ? 'bg-cyan-500' : 'bg-border-visible'
              )}
            >
              <motion.div
                className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full"
                animate={{ x: annual ? 28 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={clsx('text-sm', annual ? 'text-text-primary' : 'text-text-tertiary')}>
              Annual
              <span className="ml-1 text-cyan-400 font-medium">save 17%</span>
            </span>
          </motion.div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              className={clsx(
                'relative bg-bg-elevated border rounded-xl p-8 flex flex-col',
                plan.highlighted
                  ? 'border-cyan-500 shadow-lg shadow-cyan-500/10'
                  : 'border-border-subtle'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}

              <h3 className="text-2xl font-bold text-text-primary mb-2">{plan.name}</h3>
              <div className="mb-2">
                <span className="text-5xl font-bold text-text-primary">
                  ${annual ? plan.price.annual : plan.price.monthly}
                </span>
                <span className="text-text-tertiary">/seat/month</span>
              </div>
              <p className="text-sm text-text-tertiary mb-6">
                billed {annual ? 'annually' : 'monthly'}
              </p>

              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-text-secondary">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.note && (
                <p className="text-sm text-text-tertiary mb-6 italic">{plan.note}</p>
              )}

              <a
                href={`/checkout?plan=${plan.id}${annual ? '&billing=annual' : ''}`}
                className={clsx(
                  'block text-center py-4 rounded-lg font-semibold transition-all',
                  plan.highlighted
                    ? 'bg-text-primary text-bg-base hover:translate-y-[-2px] hover:shadow-lg hover:shadow-white/15'
                    : 'border border-border-visible text-text-primary hover:border-text-muted hover:bg-bg-base'
                )}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works section */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="text-3xl font-bold text-text-primary text-center mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Team vs Enterprise: Where does your code go?
          </motion.h2>
          <motion.p
            className="text-text-secondary text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Both plans are secure. Enterprise is for teams with strict compliance requirements.
          </motion.p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Team plan flow */}
            <motion.div
              className="bg-bg-elevated border border-border-subtle rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-xl font-semibold text-text-primary mb-4">Team ($12/seat)</h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">1</div>
                  <span className="text-text-secondary">Your AI Tool sends session data</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">2</div>
                  <span className="text-text-secondary">Recall API summarizes with our LLM</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">3</div>
                  <span className="text-text-secondary">Pushed to your GitHub, then deleted</span>
                </div>
              </div>
              <div className="mt-6 p-4 bg-bg-base rounded-lg">
                <p className="text-text-tertiary text-sm">
                  Your code briefly passes through our summarization service. We process it, push to your repo, delete it. Nothing stored. But it does touch our servers.
                </p>
              </div>
            </motion.div>

            {/* Enterprise plan flow */}
            <motion.div
              className="bg-bg-elevated border border-purple-500/30 rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-xl font-semibold text-text-primary mb-4">Enterprise ($30/seat)</h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">1</div>
                  <span className="text-text-secondary">Your AI Tool sends session data</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">2</div>
                  <span className="text-text-secondary">YOUR LLM API summarizes</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">3</div>
                  <span className="text-text-secondary">Pushed directly to your GitHub</span>
                </div>
              </div>
              <div className="mt-6 p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                <p className="text-purple-300 text-sm">
                  You provide your own LLM API key (OpenAI, Anthropic, etc). Summarization happens on YOUR account. Your code never touches Recall servers. Ever.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          <motion.h2
            className="text-3xl font-bold text-text-primary text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Frequently Asked Questions
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                q={faq.q}
                a={faq.a}
                isOpen={openFaq === index}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="pb-24 px-6">
        <motion.div
          className="max-w-2xl mx-auto text-center bg-bg-elevated border border-border-subtle rounded-xl p-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            Need custom terms or volume pricing?
          </h2>
          <p className="text-text-secondary mb-8">
            SSO, custom contracts, dedicated support, volume discounts.
          </p>
          <a
            href="mailto:enterprise@recall.team"
            className="inline-flex items-center gap-2 bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-400 transition-colors"
          >
            Contact Sales
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
}
