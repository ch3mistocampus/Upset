'use client'

import { motion } from 'framer-motion'
import { COPY } from '@/lib/copy'

export function WhyDifferent() {
  return (
    <section className="py-24 px-4" aria-labelledby="why-different-title">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Title */}
          <h2 id="why-different-title" className="text-3xl md:text-5xl font-display tracking-wide mb-6">
            {COPY.whyDifferent.title}
          </h2>

          {/* Body */}
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto">
            {COPY.whyDifferent.body}
          </p>

          {/* Bullet Points */}
          <ul className="space-y-4 mb-12">
            {COPY.whyDifferent.bullets.map((bullet, index) => (
              <motion.li
                key={bullet}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex items-center justify-center gap-3 text-lg md:text-xl"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold-500/20 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-gold-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-gray-200">{bullet}</span>
              </motion.li>
            ))}
          </ul>

          {/* Closing Statement */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-2xl md:text-4xl font-display tracking-wide text-red-500"
          >
            {COPY.whyDifferent.closing}
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
