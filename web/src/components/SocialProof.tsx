'use client';

import { motion } from 'framer-motion';

export function SocialProof() {
  // Placeholder testimonials - to be replaced with real ones post-launch
  const testimonials = [
    {
      quote: "Finally, my AI knows what we decided last week.",
      author: "@developer",
      company: "Company",
    },
    {
      quote: "Onboarding a new dev used to take days. Now it takes an hour.",
      author: "@techlead",
      company: "Startup",
    },
  ];

  return (
    <section className="py-24 px-6 border-t border-border-subtle">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Teams ship faster with Recall.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-bg-elevated border border-border-subtle rounded-xl p-6"
            >
              <p className="text-text-primary text-lg mb-4">"{testimonial.quote}"</p>
              <p className="text-text-tertiary">
                {testimonial.author}, {testimonial.company}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Placeholder for company logos */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-text-tertiary text-sm mb-6">Trusted by teams at</p>
          <div className="flex items-center justify-center gap-12 opacity-40">
            {/* Placeholder logos - these will be replaced with actual company logos */}
            <div className="w-24 h-8 bg-text-tertiary/20 rounded" />
            <div className="w-24 h-8 bg-text-tertiary/20 rounded" />
            <div className="w-24 h-8 bg-text-tertiary/20 rounded" />
            <div className="w-24 h-8 bg-text-tertiary/20 rounded" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
