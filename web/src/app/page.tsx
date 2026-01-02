'use client';

import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Problem } from '@/components/Problem';
import { HowItWorks } from '@/components/HowItWorks';
import { Product } from '@/components/Product';
import { WorksWith } from '@/components/WorksWith';
import { Pricing } from '@/components/Pricing';
import { FinalCTA } from '@/components/FinalCTA';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-bg-base">
      <Header />
      <Hero />
      <Problem />
      <HowItWorks />
      <Product />
      <WorksWith />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  );
}
