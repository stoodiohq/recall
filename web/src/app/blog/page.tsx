'use client';

export const runtime = 'edge';

import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
}

const posts: BlogPost[] = [
  {
    slug: 'introducing-recall',
    title: 'Introducing Recall: Your AI Finally Remembers',
    description: 'Every AI coding session starts fresh. Your AI doesn\'t know what you did yesterday, what your teammate tried last week, or why the code is the way it is. Today, that changes.',
    date: 'January 10, 2026',
    readTime: '3 min read',
    category: 'Announcement',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      <Header />

      <main className="pt-32 pb-24">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
              Blog
            </h1>
            <p className="text-text-secondary text-lg mb-12">
              Updates, insights, and stories about building with AI.
            </p>

            <div className="grid gap-8">
              {posts.map((post, index) => (
                <motion.a
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="group block bg-bg-elevated border border-border-subtle rounded-xl p-6 hover:border-text-tertiary transition-colors"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-text-primary/10 text-text-primary">
                      {post.category}
                    </span>
                    <span className="text-sm text-text-tertiary">{post.date}</span>
                    <span className="text-sm text-text-tertiary">{post.readTime}</span>
                  </div>

                  <h2 className="text-xl font-semibold text-text-primary mb-2 group-hover:text-white transition-colors">
                    {post.title}
                  </h2>

                  <p className="text-text-secondary">
                    {post.description}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-text-tertiary group-hover:text-text-secondary transition-colors">
                    <span className="text-sm">Read more</span>
                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.a>
              ))}
            </div>

            {/* Newsletter signup */}
            <div className="mt-16 bg-bg-elevated border border-border-subtle rounded-xl p-8 text-center">
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Stay in the loop
              </h3>
              <p className="text-text-secondary mb-6">
                Get notified when we publish new posts and release major updates.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="you@company.com"
                  className="flex-1 px-4 py-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-text-tertiary"
                />
                <button className="px-6 py-2.5 bg-text-primary text-bg-base rounded-lg font-medium hover:translate-y-[-1px] hover:shadow-lg transition-all">
                  Subscribe
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
