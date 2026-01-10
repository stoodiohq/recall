'use client';

export const runtime = 'edge';

import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-text-tertiary mb-12">
              Last updated: January 10, 2026
            </p>

            <div className="prose prose-invert max-w-none">
              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">Overview</h2>
                <p className="text-text-secondary leading-relaxed mb-4">
                  Recall ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our service at recall.team.
                </p>
                <p className="text-text-secondary leading-relaxed">
                  <strong className="text-text-primary">The short version:</strong> Your code never touches our servers. Session context is processed and immediately deleted. We store only metadata needed to run the service.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">What We Collect</h2>

                <h3 className="text-xl font-medium text-text-primary mb-3 mt-6">Account Information</h3>
                <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                  <li>GitHub username and ID (via OAuth)</li>
                  <li>Email address (from GitHub)</li>
                  <li>Profile avatar URL</li>
                  <li>Team name and company information you provide</li>
                </ul>

                <h3 className="text-xl font-medium text-text-primary mb-3 mt-6">Usage Metadata</h3>
                <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                  <li>Session timestamps (when sessions start/end)</li>
                  <li>Token counts (how much context was used)</li>
                  <li>Repository names you enable</li>
                  <li>Team membership information</li>
                </ul>

                <h3 className="text-xl font-medium text-text-primary mb-3 mt-6">What We Do NOT Collect</h3>
                <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                  <li>Your source code</li>
                  <li>Session transcripts or content</li>
                  <li>AI conversation history</li>
                  <li>Context or memory file contents</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">How Your Data Flows</h2>

                <h3 className="text-xl font-medium text-text-primary mb-3 mt-6">Team Plan</h3>
                <p className="text-text-secondary leading-relaxed mb-4">
                  When you save a session, the content is sent to our API, processed by our LLM to extract key decisions and learnings, then immediately written to your GitHub repository. After the GitHub commit succeeds, session content is deleted from our systems. We retain only the metadata (timestamp, token count, success/failure).
                </p>

                <h3 className="text-xl font-medium text-text-primary mb-3 mt-6">Enterprise Plan (BYOK)</h3>
                <p className="text-text-secondary leading-relaxed">
                  With Bring Your Own Key, session content goes directly from your AI tool to YOUR LLM API. We never see the content. We only route the encrypted API key and write the results to your GitHub.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">Data Storage</h2>
                <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                  <li><strong className="text-text-primary">Our Database (Cloudflare D1):</strong> Account info, team data, membership, session metadata, encrypted LLM keys (Enterprise only)</li>
                  <li><strong className="text-text-primary">Your GitHub Repository:</strong> All context files, history, and session records live in your .recall/ directory</li>
                  <li><strong className="text-text-primary">Stripe:</strong> Payment information (we never see your full card number)</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">Third-Party Services</h2>
                <p className="text-text-secondary leading-relaxed mb-4">We use the following third-party services:</p>
                <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                  <li><strong className="text-text-primary">GitHub:</strong> Authentication and repository access</li>
                  <li><strong className="text-text-primary">Stripe:</strong> Payment processing</li>
                  <li><strong className="text-text-primary">Cloudflare:</strong> Infrastructure (Workers, D1, Pages)</li>
                  <li><strong className="text-text-primary">Anthropic/OpenAI:</strong> LLM processing for Team plan (session content only, immediately deleted after processing)</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">Your Rights</h2>
                <p className="text-text-secondary leading-relaxed mb-4">You can:</p>
                <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                  <li>Delete your account at any time (Settings → Delete Account)</li>
                  <li>Export your data (it's already in your GitHub repo)</li>
                  <li>Disconnect repositories from Recall</li>
                  <li>Delete the .recall/ directory from your repos</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">Security</h2>
                <p className="text-text-secondary leading-relaxed">
                  We use industry-standard security measures including encrypted connections (HTTPS), encrypted API key storage (AES-256-GCM), and minimal data retention. Our infrastructure runs on Cloudflare's edge network with DDoS protection and WAF.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">Changes to This Policy</h2>
                <p className="text-text-secondary leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold text-text-primary mb-4">Contact Us</h2>
                <p className="text-text-secondary leading-relaxed">
                  If you have questions about this Privacy Policy, please contact us at{' '}
                  <a href="mailto:privacy@recall.team" className="text-text-primary hover:underline">
                    privacy@recall.team
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
