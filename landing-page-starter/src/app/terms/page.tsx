import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service - Upset',
  description: 'Terms of Service for the Upset UFC picks tracking app',
}

export default function TermsOfService() {
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
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-gray-400 text-sm mb-8">Last Updated: January 10, 2026</p>

          <h2>Agreement to Terms</h2>
          <p>
            By downloading, accessing, or using the Upset mobile application ("App"), you agree
            to be bound by these Terms of Service. If you do not agree, do not use the App.
          </p>

          <h2>Description of Service</h2>
          <p>Upset is a free mobile application that allows users to:</p>
          <ul>
            <li>Make predictions on UFC fight outcomes</li>
            <li>Track prediction accuracy over time</li>
            <li>Compete on leaderboards with other users</li>
            <li>Share posts and interact with the community</li>
          </ul>
          <p className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-200">
            <strong>Important:</strong> Upset is NOT a gambling or betting application. No real
            money is wagered, won, or lost. The App is for entertainment and skill-tracking
            purposes only.
          </p>

          <h2>Eligibility</h2>
          <p>
            You must be at least 13 years old to use the App. If you are under 18, you represent
            that you have your parent or guardian's permission.
          </p>

          <h2>Account Registration</h2>
          <p>
            To access certain features, you must create an account. You are responsible for
            maintaining the confidentiality of your credentials and all activities under your
            account. You may only maintain one account.
          </p>

          <h2>User Conduct</h2>
          <p>You agree NOT to:</p>
          <ul>
            <li>Create multiple accounts to manipulate statistics or leaderboards</li>
            <li>Use automated tools, bots, or scripts to make picks</li>
            <li>Post content that is illegal, harmful, threatening, or harassing</li>
            <li>Impersonate any person or entity</li>
            <li>Attempt to gain unauthorized access to the App</li>
            <li>Interfere with or disrupt the App's operation</li>
          </ul>

          <h2>User Content</h2>
          <p>
            You retain ownership of content you create. By posting content, you grant us a
            non-exclusive, worldwide, royalty-free license to use, display, and distribute
            your content within the App.
          </p>
          <p>
            Your picks are recorded permanently to maintain leaderboard integrity. Picks
            cannot be deleted but can be made private.
          </p>

          <h2>Leaderboard Integrity</h2>
          <p>
            We take fair play seriously. We may monitor for suspicious activity, investigate
            reported violations, and remove or adjust fraudulent statistics.
          </p>

          <h2>Termination</h2>
          <p>
            We may suspend or terminate your account at any time for violations of these Terms.
            You may delete your account at any time through the App settings.
          </p>

          <h2>Disclaimers</h2>
          <p>
            The App is provided "as is" without warranties of any kind. We do not guarantee
            accuracy of fight data or statistics.
          </p>

          <h2>Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, we shall not be liable for any indirect,
            incidental, special, or consequential damages arising from your use of the App.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have questions about these Terms, please contact us at{' '}
            <a href="mailto:legal@getupset.app" className="text-red-500 hover:text-red-400">
              legal@getupset.app
            </a>
          </p>
        </article>
      </div>
    </main>
  )
}
