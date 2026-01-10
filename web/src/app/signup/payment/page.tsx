'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface PlanData {
  plan: 'team' | 'enterprise';
  billing: 'monthly' | 'annual';
  seats: number;
}

function PaymentContent() {
  const router = useRouter();
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('signup_plan');
    if (stored) {
      setPlanData(JSON.parse(stored));
    } else {
      router.push('/signup/plan');
    }
  }, [router]);

  const pricing = {
    team: { monthly: 12, annual: 10 },
    enterprise: { monthly: 30, annual: 25 },
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + (v.length > 2 ? '/' + v.slice(2, 4) : '');
    }
    return v;
  };

  const handleSubmit = async () => {
    setProcessing(true);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In production, this would:
    // 1. Create a Stripe payment method
    // 2. Create a customer
    // 3. Create a subscription with trial

    localStorage.setItem('signup_payment', JSON.stringify({
      last4: cardNumber.slice(-4),
    }));

    router.push('/signup/connect');
  };

  if (!planData) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pricePerSeat = pricing[planData.plan][planData.billing];
  const totalMonthly = planData.seats * pricePerSeat;

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
          <a href="/" className="font-semibold text-xl text-text-primary">recall</a>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-12">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="w-12 h-0.5 bg-cyan-500" />
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white text-sm font-bold">2</div>
            <div className="w-12 h-0.5 bg-border-subtle" />
            <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center text-text-tertiary text-sm">3</div>
            <div className="w-12 h-0.5 bg-border-subtle" />
            <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center text-text-tertiary text-sm">4</div>
          </div>

          <h1 className="text-3xl font-bold text-text-primary text-center mb-2">Add payment method</h1>
          <p className="text-text-secondary text-center mb-8">You won't be charged until your 14-day trial ends.</p>

          {/* Plan summary */}
          <div className="bg-bg-elevated border border-border-subtle rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-primary font-medium capitalize">{planData.plan} Plan</p>
                <p className="text-text-tertiary text-sm">
                  {planData.seats} {planData.seats === 1 ? 'seat' : 'seats'} x ${pricePerSeat}/mo
                </p>
              </div>
              <div className="text-right">
                <p className="text-text-primary font-bold">${totalMonthly}/mo</p>
                <p className="text-green-400 text-sm">14-day trial</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/signup/plan')}
              className="text-cyan-400 text-sm hover:underline mt-2"
            >
              Change plan
            </button>
          </div>

          {/* Card form */}
          <div className="space-y-4">
            <div>
              <label className="block text-text-secondary text-sm mb-2">Card number</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
                placeholder="1234 5678 9012 3456"
                className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-text-secondary text-sm mb-2">Expiry</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                  placeholder="MM/YY"
                  className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-2">CVC</label>
                <input
                  type="text"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  placeholder="123"
                  className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-2">Name on card</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={processing || !cardNumber || !expiry || !cvc || !name}
            className="w-full mt-8 py-4 bg-text-primary text-bg-base rounded-lg font-semibold hover:translate-y-[-1px] hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {processing ? 'Processing...' : 'Start 14-day free trial'}
          </button>

          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="flex items-center gap-1 text-text-tertiary text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secured by Stripe
            </div>
            <span className="text-text-tertiary">|</span>
            <span className="text-text-tertiary text-sm">Cancel anytime</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
