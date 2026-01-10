'use client';

export const runtime = 'edge';

import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function IntroducingRecallPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      <Header />

      <main className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Header */}
            <div className="mb-12">
              <a
                href="/blog"
                className="inline-flex items-center gap-2 text-text-tertiary hover:text-text-secondary mb-6 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Blog
              </a>

              <div className="flex items-center gap-4 mb-4">
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-text-primary/10 text-text-primary">
                  Announcement
                </span>
                <span className="text-sm text-text-tertiary">January 10, 2026</span>
                <span className="text-sm text-text-tertiary">3 min read</span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-6">
                Introducing Recall: Your AI Finally Remembers
              </h1>

              <p className="text-xl text-text-secondary">
                Every AI coding session starts fresh. Today, that changes.
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-invert max-w-none">
              <p className="text-text-secondary leading-relaxed text-lg">
                If you use AI coding assistants, you know the frustration. Every session starts from zero. Your AI doesn't know what you did yesterday, what your teammate tried last week, or why the code is the way it is.
              </p>

              <p className="text-text-secondary leading-relaxed text-lg mt-6">
                You waste hours re-explaining context. Your team re-litigates decisions. The same mistakes get repeated because nobody remembers what failed before.
              </p>

              <h2 className="text-2xl font-semibold text-text-primary mt-12 mb-4">
                The Problem is Obvious
              </h2>

              <p className="text-text-secondary leading-relaxed">
                AI coding assistants are incredible at writing code. But they have no memory. Every conversation is isolated. All that valuable context—the decisions, the failures, the lessons learned—disappears the moment you close the session.
              </p>

              <p className="text-text-secondary leading-relaxed mt-4">
                This is especially painful for teams. When Sarah discovers that a particular approach doesn't work with your database, how does Mike know not to try it tomorrow? When you spend two hours debugging an edge case, how does your future self benefit from that knowledge?
              </p>

              <h2 className="text-2xl font-semibold text-text-primary mt-12 mb-4">
                Recall Makes AI Remember
              </h2>

              <p className="text-text-secondary leading-relaxed">
                Recall captures context from every AI coding session and makes it available to your whole team automatically. No commands to remember. No files to manage. It just works.
              </p>

              <p className="text-text-secondary leading-relaxed mt-4">
                When a session ends, Recall:
              </p>

              <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4 mt-4">
                <li>Extracts what matters—decisions, failures, lessons, patterns</li>
                <li>Updates your team's shared context</li>
                <li>Stores everything in your GitHub repository</li>
                <li>Makes it available to the next session automatically</li>
              </ul>

              <p className="text-text-secondary leading-relaxed mt-6">
                The next time anyone on your team starts coding, the AI already knows. What was tried. What worked. What failed. Why the code is the way it is.
              </p>

              <h2 className="text-2xl font-semibold text-text-primary mt-12 mb-4">
                How It Works
              </h2>

              <p className="text-text-secondary leading-relaxed">
                Recall integrates with your AI coding tool via MCP (Model Context Protocol). It works with Claude Code, Cursor, Windsurf, and any MCP-compatible assistant.
              </p>

              <p className="text-text-secondary leading-relaxed mt-4">
                At the start of each session, Recall loads team context. As you work, it captures important moments. At the end, it summarizes and saves. Everything lives in a <code className="bg-bg-base px-1.5 py-0.5 rounded text-text-primary">.recall/</code> directory in your repository—versioned, searchable, yours.
              </p>

              <h2 className="text-2xl font-semibold text-text-primary mt-12 mb-4">
                Your Code Never Touches Our Servers
              </h2>

              <p className="text-text-secondary leading-relaxed">
                We know security matters. That's why your source code never passes through Recall. Session summaries are processed and immediately deleted. Everything that matters lives in your GitHub repository.
              </p>

              <p className="text-text-secondary leading-relaxed mt-4">
                Enterprise customers can bring their own LLM keys (BYOK). With BYOK, even session content never touches our servers—it goes directly from your AI tool to your LLM API.
              </p>

              <h2 className="text-2xl font-semibold text-text-primary mt-12 mb-4">
                What Developers Are Saying
              </h2>

              <blockquote className="border-l-2 border-text-tertiary pl-6 my-8">
                <p className="text-text-secondary italic text-lg">
                  "Day 1: I didn't have to do anything different. It just worked. Day 2: Wait, it remembers what I did? Nice."
                </p>
              </blockquote>

              <blockquote className="border-l-2 border-text-tertiary pl-6 my-8">
                <p className="text-text-secondary italic text-lg">
                  "I know more about this codebase after 10 minutes than I usually do after a week."
                </p>
                <p className="text-text-tertiary mt-2">— New team member, week 2</p>
              </blockquote>

              <h2 className="text-2xl font-semibold text-text-primary mt-12 mb-4">
                Get Started Today
              </h2>

              <p className="text-text-secondary leading-relaxed">
                Recall is available now with a 14-day free trial. Setup takes 2 minutes:
              </p>

              <ol className="list-decimal list-inside text-text-secondary space-y-2 ml-4 mt-4">
                <li>Sign up with GitHub</li>
                <li>Install the MCP server</li>
                <li>Start coding</li>
              </ol>

              <p className="text-text-secondary leading-relaxed mt-6">
                That's it. No configuration. No training. Your AI just got a memory.
              </p>

              <div className="mt-12 flex flex-col sm:flex-row gap-4">
                <a
                  href="/signup"
                  className="inline-flex items-center justify-center px-6 py-3 bg-text-primary text-bg-base rounded-lg font-semibold hover:translate-y-[-1px] hover:shadow-lg transition-all"
                >
                  Start Free Trial
                </a>
                <a
                  href="/docs"
                  className="inline-flex items-center justify-center px-6 py-3 border border-border-subtle text-text-secondary rounded-lg font-medium hover:border-text-tertiary transition-colors"
                >
                  Read the Docs
                </a>
              </div>
            </div>
          </motion.article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
