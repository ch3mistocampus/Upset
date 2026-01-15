'use client'

import { motion } from 'framer-motion'
import { WaitlistForm } from './WaitlistForm'
import { COPY } from '@/lib/copy'

export function FinalCTA() {
  return (
    <section className="py-24 px-4 relative overflow-hidden" aria-labelledby="final-cta-title">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gold-500/10 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Title */}
          <h2 id="final-cta-title" className="text-3xl md:text-5xl font-display tracking-wide mb-4">
            {COPY.finalCta.title}
          </h2>

          {/* Body */}
          <p className="text-gray-400 text-lg mb-8">
            {COPY.finalCta.body}
          </p>

          {/* Waitlist Form */}
          <WaitlistForm />
        </motion.div>
      </div>
    </section>
  )
}
