'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

type Plan = 'team' | 'enterprise';
type Billing = 'monthly' | 'annual';

function PlanSelectionContent() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<Plan>('team');
  const [billingCycle, setBillingCycle] = useState<Billing>('monthly');
  const [seats, setSeats] = useState(3);

  const pricing = {
    team: { monthly: 12, annual: 10 },
    enterprise: { monthly: 30, annual: 25 },
  };

  const pricePerSeat = pricing[selectedPlan][billingCycle];
  const totalMonthly = seats * pricePerSeat;
  const totalAnnual = totalMonthly * 12;
  const annualSavings = selectedPlan === 'team' ? 17 : 17;

  const handleContinue = () => {
    // Store selections in localStorage for the next step
    localStorage.setItem('signup_plan', JSON.stringify({
      plan: selectedPlan,
      billing: billingCycle,
      seats,
    }));
    router.push('/signup/payment');
  };

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
          <a href="/" className="font-semibold text-xl text-text-primary">recall</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-12">
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white text-sm font-bold">1</div>
            <div className="w-12 h-0.5 bg-border-subtle" />
            <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center text-text-tertiary text-sm">2</div>
            <div className="w-12 h-0.5 bg-border-subtle" />
            <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center text-text-tertiary text-sm">3</div>
            <div className="w-12 h-0.5 bg-border-subtle" />
            <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center text-text-tertiary text-sm">4</div>
          </div>

          <h1 className="text-3xl font-bold text-text-primary text-center mb-2">Choose your plan</h1>
          <p className="text-text-secondary text-center mb-12">Start with a 14-day free trial. Cancel anytime.</p>

          {/* Billing toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-bg-elevated rounded-lg p-1 border border-border-subtle">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-bg-base text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  billingCycle === 'annual'
                    ? 'bg-bg-base text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Annual
                <span className="px-1.5 py-0.5 text-xs rounded bg-green-500/20 text-green-400">Save {annualSavings}%</span>
              </button>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Team Plan */}
            <button
              onClick={() => setSelectedPlan('team')}
              className={`text-left p-6 rounded-xl border-2 transition-all ${
                selectedPlan === 'team'
                  ? 'border-cyan-500 bg-cyan-500/5'
                  : 'border-border-subtle bg-bg-elevated hover:border-text-tertiary'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === 'team' ? 'border-cyan-500' : 'border-text-tertiary'
                }`}>
                  {selectedPlan === 'team' && <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />}
                </div>
                <h2 className="text-xl font-bold text-text-primary">Team</h2>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-text-primary">${pricing.team[billingCycle]}</span>
                <span className="text-text-secondary">/seat/month</span>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited repos & sessions
                </li>
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Full team memory
                </li>
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  We handle summarization
                </li>
              </ul>
            </button>

            {/* Enterprise Plan */}
            <button
              onClick={() => setSelectedPlan('enterprise')}
              className={`text-left p-6 rounded-xl border-2 transition-all ${
                selectedPlan === 'enterprise'
                  ? 'border-cyan-500 bg-cyan-500/5'
                  : 'border-border-subtle bg-bg-elevated hover:border-text-tertiary'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === 'enterprise' ? 'border-cyan-500' : 'border-text-tertiary'
                }`}>
                  {selectedPlan === 'enterprise' && <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />}
                </div>
                <h2 className="text-xl font-bold text-text-primary">Enterprise</h2>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-text-primary">${pricing.enterprise[billingCycle]}</span>
                <span className="text-text-secondary">/seat/month</span>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Everything in Team, plus:
                </li>
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Bring your own LLM key
                </li>
                <li className="flex items-center gap-2 text-text-secondary">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Code never touches our servers
                </li>
              </ul>
            </button>
          </div>

          {/* Seat selector */}
          <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 mb-8">
            <label className="block text-text-primary font-medium mb-4">Number of seats</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSeats(Math.max(1, seats - 1))}
                className="w-10 h-10 rounded-lg border border-border-subtle bg-bg-base text-text-primary hover:border-text-tertiary transition-colors flex items-center justify-center text-xl"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="100"
                value={seats}
                onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center bg-bg-base border border-border-subtle rounded-lg px-3 py-2 text-text-primary text-lg font-medium focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => setSeats(Math.min(100, seats + 1))}
                className="w-10 h-10 rounded-lg border border-border-subtle bg-bg-base text-text-primary hover:border-text-tertiary transition-colors flex items-center justify-center text-xl"
              >
                +
              </button>
              <span className="text-text-secondary ml-2">
                {seats === 1 ? 'seat' : 'seats'}
              </span>
            </div>
          </div>

          {/* Price summary */}
          <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary">
                {selectedPlan === 'team' ? 'Team' : 'Enterprise'} plan
              </span>
              <span className="text-text-primary">
                ${pricePerSeat}/seat/month
              </span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-text-secondary">{seats} {seats === 1 ? 'seat' : 'seats'}</span>
              <span className="text-text-primary">x {seats}</span>
            </div>
            <div className="border-t border-border-subtle pt-4">
              <div className="flex items-center justify-between">
                <span className="text-text-primary font-semibold">
                  {billingCycle === 'monthly' ? 'Monthly total' : 'Annual total'}
                </span>
                <span className="text-2xl font-bold text-text-primary">
                  ${billingCycle === 'monthly' ? totalMonthly : totalAnnual}
                  <span className="text-text-tertiary text-base font-normal">
                    /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </span>
              </div>
              {billingCycle === 'annual' && (
                <p className="text-green-400 text-sm mt-1 text-right">
                  You save ${(seats * (pricing[selectedPlan].monthly - pricing[selectedPlan].annual) * 12)}/year
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleContinue}
            className="w-full py-4 bg-text-primary text-bg-base rounded-lg font-semibold hover:translate-y-[-1px] hover:shadow-lg transition-all"
          >
            Continue to payment
          </button>

          <p className="text-center text-text-tertiary text-sm mt-4">
            14-day free trial. No charge until trial ends.
          </p>
        </motion.div>
      </main>
    </div>
  );
}

export default function PlanSelectionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PlanSelectionContent />
    </Suspense>
  );
}
