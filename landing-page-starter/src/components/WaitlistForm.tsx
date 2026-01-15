'use client'

import { useState, useEffect, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { COPY } from '@/lib/copy'

const STORAGE_KEY = 'upset_waitlist_joined'

// Basic email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface WaitlistFormProps {
  className?: string
}

export function WaitlistForm({ className = '' }: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [hasJoined, setHasJoined] = useState(false)

  // Check localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const joined = localStorage.getItem(STORAGE_KEY)
      if (joined === 'true') {
        setHasJoined(true)
        setStatus('success')
        setMessage(COPY.waitlist.alreadyJoined)
      }
    }
  }, [])

  const validateEmail = (email: string): boolean => {
    return EMAIL_REGEX.test(email)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Validate email format
    if (!validateEmail(email)) {
      setStatus('error')
      setMessage('Please enter a valid email address.')
      return
    }

    setStatus('loading')

    try {
      // Try to call the waitlist endpoint if configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      if (supabaseUrl) {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/waitlist-signup`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, source: 'landing' }),
          }
        )

        if (res.ok) {
          handleSuccess()
        } else {
          const data = await res.json().catch(() => ({}))
          setStatus('error')
          setMessage(data.error || COPY.waitlist.error)
        }
      } else {
        // Placeholder behavior: log and show success
        console.log('Waitlist signup (placeholder):', email)
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800))
        handleSuccess()
      }
    } catch {
      setStatus('error')
      setMessage(COPY.waitlist.error)
    }
  }

  const handleSuccess = () => {
    setStatus('success')
    setMessage(COPY.waitlist.success)
    setEmail('')
    setHasJoined(true)
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
  }

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <AnimatePresence mode="wait">
        {status === 'success' || hasJoined ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center p-6 bg-green-500/10 border border-green-500/30 rounded-xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-12 h-12 mx-auto mb-3 bg-green-500/20 rounded-full flex items-center justify-center"
            >
              <svg
                className="w-6 h-6 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <p className="text-green-400 font-semibold text-lg">You&apos;re on the list!</p>
            <p className="text-gray-400 text-sm mt-1">{message}</p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3"
          >
            <label htmlFor="waitlist-email" className="sr-only">
              Email address
            </label>
            <input
              id="waitlist-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                // Clear error when user starts typing
                if (status === 'error') setStatus('idle')
              }}
              placeholder={COPY.hero.emailPlaceholder}
              required
              disabled={status === 'loading'}
              aria-describedby={status === 'error' ? 'waitlist-error' : undefined}
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-gold-500/30
                         text-white placeholder:text-gray-400
                         focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500
                         disabled:opacity-50 transition-all"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold
                         border border-gold-500/50 shadow-lg shadow-gold-500/20
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors flex items-center justify-center gap-2
                         min-w-[160px] focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-black"
            >
              {status === 'loading' ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{COPY.waitlist.loading}</span>
                </>
              ) : (
                COPY.hero.ctaButton
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {status === 'error' && (
          <motion.p
            id="waitlist-error"
            role="alert"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-red-400 text-sm text-center"
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
