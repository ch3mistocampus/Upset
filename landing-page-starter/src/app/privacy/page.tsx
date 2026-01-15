import Link from 'next/link'
import { PRIVACY_POLICY } from '@/lib/copy'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Privacy Policy - Upset',
  description: 'Privacy Policy for the Upset fight picks tracking app',
}

export default function PrivacyPolicy() {
  return (
    <>
      <main className="min-h-screen py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to home
          </Link>

          <article className="prose prose-invert prose-lg max-w-none">
            <h1 className="text-4xl font-bold mb-2">{PRIVACY_POLICY.title}</h1>
            <p className="text-gray-400 text-sm mb-8">{PRIVACY_POLICY.lastUpdated}</p>

            {PRIVACY_POLICY.sections.map((section) => (
              <section key={section.heading} className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>

                {section.bullets && (
                  <ul className="list-disc list-inside space-y-2 mb-4">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="text-gray-300">{bullet}</li>
                    ))}
                  </ul>
                )}

                {section.body && (
                  <p className="text-gray-300">{section.body}</p>
                )}
              </section>
            ))}
          </article>
        </div>
      </main>
      <Footer />
    </>
  )
}
