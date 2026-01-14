import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy - Upset',
  description: 'Privacy Policy for the Upset UFC picks tracking app',
}

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to home
        </Link>

        <article className="prose prose-invert prose-lg max-w-none">
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-gray-400 text-sm mb-8">Last Updated: January 10, 2026</p>

          <h2>Introduction</h2>
          <p>
            Upset ("we," "our," or "us") operates the Upset mobile application (the "App").
            This Privacy Policy explains how we collect, use, disclose, and safeguard your
            information when you use our App.
          </p>

          <h2>Information We Collect</h2>

          <h3>Information You Provide</h3>
          <ul>
            <li><strong>Account Information</strong>: Email address, username, password (encrypted)</li>
            <li><strong>Profile Information</strong>: Display name, bio, profile visibility preferences</li>
            <li><strong>User-Generated Content</strong>: Fight predictions, posts, comments, friend connections</li>
          </ul>

          <h3>Information Collected Automatically</h3>
          <ul>
            <li><strong>Usage Data</strong>: App interactions, pick history, timestamps</li>
            <li><strong>Device Information</strong>: Device type, OS, app version, crash reports</li>
          </ul>

          <h3>Third-Party Authentication</h3>
          <p>
            When you sign in with Google or Apple, we receive your email address, name, and
            profile picture URL. We do not receive or store your passwords from these providers.
          </p>

          <h2>How We Use Your Information</h2>
          <ul>
            <li>Create and manage your account</li>
            <li>Enable fight predictions and track accuracy</li>
            <li>Facilitate social features (friends, leaderboards, posts)</li>
            <li>Send important account notifications</li>
            <li>Improve the App and fix bugs</li>
            <li>Ensure security and prevent fraud</li>
          </ul>

          <h2>Information Sharing</h2>
          <p>
            Your username, pick accuracy, posts, and leaderboard rankings may be visible to
            other users based on your privacy settings. We share data with service providers
            (Supabase, Sentry) to operate the App.
          </p>

          <h2>Data Retention</h2>
          <p>
            We retain your information for as long as your account is active. You can request
            deletion of your account and associated data at any time.
          </p>

          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Opt out of marketing communications</li>
          </ul>

          <h2>Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at{' '}
            <a href="mailto:privacy@getupset.app" className="text-red-500 hover:text-red-400">
              privacy@getupset.app
            </a>
          </p>
        </article>
      </div>
    </main>
  )
}
