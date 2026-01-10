'use client';

export const runtime = 'edge';

import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      <Header />

      <main className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              Terms of Service
            </h1>
            <p className="text-text-tertiary mb-12">
              Last updated: January 10, 2026
            </p>

            <div className="prose prose-invert max-w-none">
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">1. Agreement to Terms</h2>
                <p className="text-text-secondary leading-relaxed">
                  By accessing or using Recall ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">2. Description of Service</h2>
                <p className="text-text-secondary leading-relaxed mb-4">
                  Recall is a team memory service for AI coding tools. The Service:
                </p>
                <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                  <li>Integrates with AI coding assistants via MCP (Model Context Protocol)</li>
                  <li>Captures and summarizes coding session context</li>
                  <li>Stores team memory in your GitHub repositories</li>
                  <li>Makes context available to team members automatically</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">3. Accounts</h2>
                <p className="text-text-secondary leading-relaxed mb-4">
                  You must have a GitHub account to use Recall. You are responsible for:
                </p>
                <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                  <li>Maintaining the security of your GitHub account</li>
                  <li>All activities that occur under your account</li>
                  <li>Ensuring your team members comply with these Terms</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">4. Subscriptions and Billing</h2>

                <h3 className="text-xl font-medium text-text-primary mb-3 mt-6">Plans</h3>
                <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                  <li><strong className="text-text-primary">Team Plan:</strong> $12/seat/month ($10/seat/month annual)</li>
                  <li><strong className="text-text-primary">Enterprise Plan:</strong> $30/seat/month ($25/seat/month annual)</li>
                </ul>

                <h3 className="text-xl font-medium text-text-primary mb-3 mt-6">Free Trial</h3>
                <p className="text-text-secondary leading-relaxed">
                  New subscriptions include a 14-day free trial. You will not be charged until the trial ends. You may cancel at any time during the trial.
                </p>

                <h3 className="text-xl font-medium text-text-primary mb-3 mt-6">Billing</h3>
                <p className="text-text-secondary leading-relaxed">
                  Subscriptions are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law or as explicitly stated in these Terms.
                </p>

                <h3 className="text-xl font-medium text-text-primary mb-3 mt-6">Cancellation</h3>
                <p className="text-text-secondary leading-relaxed">
                  You may cancel your subscription at any time. Upon cancellation, you will retain access until the end of your current billing period. Your .recall/ directory remains in your GitHub repositories after cancellation.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">5. Acceptable Use</h2>
                <p className="text-text-secondary leading-relaxed mb-4">You agree not to:</p>
                <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                  <li>Use the Service for any illegal purpose</li>
                  <li>Attempt to gain unauthorized access to any part of the Service</li>
                  <li>Interfere with or disrupt the Service</li>
                  <li>Use the Service to store or transmit malicious code</li>
                  <li>Resell or redistribute the Service without authorization</li>
                  <li>Use automated means to access the Service beyond normal MCP usage</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">6. Intellectual Property</h2>

                <h3 className="text-xl font-medium text-text-primary mb-3 mt-6">Your Content</h3>
                <p className="text-text-secondary leading-relaxed">
                  You retain all rights to your code, session content, and context files. We do not claim ownership of any content you create or store through the Service.
                </p>

                <h3 className="text-xl font-medium text-text-primary mb-3 mt-6">Our Service</h3>
                <p className="text-text-secondary leading-relaxed">
                  The Service, including its original content, features, and functionality, is owned by Recall and protected by copyright, trademark, and other intellectual property laws.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">7. Data and Privacy</h2>
                <p className="text-text-secondary leading-relaxed">
                  Your use of the Service is also governed by our{' '}
                  <a href="/privacy" className="text-text-primary hover:underline">Privacy Policy</a>.
                  By using the Service, you consent to the collection and use of information as described in the Privacy Policy.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">8. Enterprise Features (BYOK)</h2>
                <p className="text-text-secondary leading-relaxed mb-4">
                  Enterprise customers using Bring Your Own Key (BYOK) agree that:
                </p>
                <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                  <li>They are responsible for their LLM API key security and usage</li>
                  <li>LLM provider terms of service apply to their API usage</li>
                  <li>We are not responsible for LLM provider outages or API changes</li>
                  <li>API keys are encrypted but customers should rotate keys periodically</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">9. Disclaimers</h2>
                <p className="text-text-secondary leading-relaxed mb-4">
                  The Service is provided "as is" without warranties of any kind.
                </p>
                <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                  <li>We do not guarantee the Service will be uninterrupted or error-free</li>
                  <li>We do not guarantee the accuracy of AI-generated summaries</li>
                  <li>We are not responsible for decisions made based on Service content</li>
                  <li>You should always review AI-generated content before committing</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">10. Limitation of Liability</h2>
                <p className="text-text-secondary leading-relaxed">
                  To the maximum extent permitted by law, Recall shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or other intangible losses, resulting from your use of the Service.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">11. Indemnification</h2>
                <p className="text-text-secondary leading-relaxed">
                  You agree to indemnify and hold harmless Recall and its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">12. Changes to Terms</h2>
                <p className="text-text-secondary leading-relaxed">
                  We reserve the right to modify these Terms at any time. We will provide notice of significant changes via email or through the Service. Your continued use of the Service after changes constitutes acceptance of the new Terms.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">13. Termination</h2>
                <p className="text-text-secondary leading-relaxed">
                  We may terminate or suspend your access immediately, without prior notice, for any breach of these Terms. Upon termination, your right to use the Service will cease immediately. Your .recall/ directory remains in your repositories.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">14. Governing Law</h2>
                <p className="text-text-secondary leading-relaxed">
                  These Terms shall be governed by the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">15. Contact</h2>
                <p className="text-text-secondary leading-relaxed">
                  For questions about these Terms, please contact us at{' '}
                  <a href="mailto:legal@recall.team" className="text-text-primary hover:underline">
                    legal@recall.team
                  </a>
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
