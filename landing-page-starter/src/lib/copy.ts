/**
 * Landing Page Copy Constants
 * Single source of truth for all marketing copy
 * NO league names (UFC, etc.) anywhere
 */

export const COPY = {
  hero: {
    brand: 'UPSET',
    headline: 'Track your fight picks. Prove your fight IQ.',
    supporting: 'Make predictions, follow fighters, and compete with fans around the world.',
    ctaButton: 'Join the Waitlist',
    subtext: 'Coming soon on iOS and Android',
    emailPlaceholder: 'Enter your email',
  },

  whatItIs: {
    title: 'Everything you need to be a smarter fight fan',
    body: 'Stop just watching fights. Upset turns every card into a competition, every pick into data, and every fan into part of a global fight community.',
  },

  features: {
    title: 'Core Features',
    items: [
      {
        title: 'Make Your Picks',
        body: 'Pick winners for every bout before the action starts. Lock in your predictions and see how you perform when the fights are over.',
        iconHint: 'clipboard-check',
      },
      {
        title: 'Track Accuracy',
        body: 'Your fight IQ, measured. See your pick accuracy over time, streaks, and trends across every event.',
        iconHint: 'bar-chart',
      },
      {
        title: 'Climb Leaderboards',
        body: 'Compete against fans around the world. Rise through the ranks and prove you know the fight game better than anyone.',
        iconHint: 'trophy',
      },
      {
        title: 'Social Feed',
        body: 'See what other fans are picking, react to predictions, and join the conversation before and after every fight night.',
        iconHint: 'chat',
      },
      {
        title: 'Connect With Friends',
        body: 'Follow friends, compare picks, and talk trash when your predictions hit. Build your own fight circle.',
        iconHint: 'users',
      },
      {
        title: 'Fighter Database',
        body: 'Explore detailed profiles for every fighter. Track records, recent performances, and how often fans are picking them.',
        iconHint: 'person',
      },
    ],
  },

  screenshots: {
    title: 'See Upset in Action',
    body: 'Pick fights, browse fighters, and scroll the feed as the community reacts in real time.',
    placeholders: ['Picks', 'Fighter Profiles', 'Feed', 'Rankings'],
  },

  whyDifferent: {
    title: 'Why Upset is Different',
    body: 'Most fight apps just show you what happened. Upset shows how good you are.',
    bullets: [
      'Your picks become a track record',
      'Your accuracy becomes your reputation',
      'Your profile becomes your fight resume',
    ],
    closing: 'Every card builds your legacy.',
  },

  finalCta: {
    title: 'Join the waitlist',
    body: 'Be first in line when Upset launches.',
    ctaButton: 'Join the Waitlist',
  },

  footer: {
    brand: 'UPSET',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
    copyright: `© ${new Date().getFullYear()} Upset. All rights reserved.`,
  },

  waitlist: {
    success: "You're on the list. We'll email you when Upset is ready.",
    error: 'Something went wrong. Try again.',
    alreadyJoined: "You're already on the list!",
    loading: 'Joining...',
  },
} as const

export const PRIVACY_POLICY = {
  title: 'Privacy Policy',
  lastUpdated: 'Last updated: January 2026',
  sections: [
    {
      heading: 'Overview',
      body: 'Upset ("we", "our", or "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use the Upset mobile application and website.',
    },
    {
      heading: 'Information We Collect',
      bullets: [
        'Email address',
        'Username and profile information',
        'Fight picks and prediction history',
        'App usage data',
      ],
      body: 'We do not collect sensitive personal information.',
    },
    {
      heading: 'How We Use Your Information',
      bullets: [
        'Create and manage accounts',
        'Track predictions and accuracy',
        'Display rankings and social features',
        'Improve the app experience',
        'Communicate important updates',
      ],
      body: 'We do not sell personal data.',
    },
    {
      heading: 'Data Storage',
      body: 'All data is stored securely using modern cloud infrastructure with restricted access.',
    },
    {
      heading: 'Third-Party Services',
      body: 'Upset may use analytics, hosting, and infrastructure providers to operate the app. These services only receive data necessary for operation.',
    },
    {
      heading: 'Your Rights',
      body: 'You may request access to or deletion of your data at any time.',
    },
    {
      heading: 'Contact',
      body: 'For questions about privacy: support@upsetapp.com',
    },
  ],
} as const

export const TERMS_OF_SERVICE = {
  title: 'Terms of Service',
  lastUpdated: 'Last updated: January 2026',
  sections: [
    {
      heading: 'Agreement',
      body: 'By using Upset, you agree to these terms.',
    },
    {
      heading: 'What Upset Is',
      body: 'Upset is a prediction-tracking and social competition app for fight fans. It is not a betting or gambling platform. No real-money wagering is supported.',
    },
    {
      heading: 'User Responsibilities',
      bullets: [
        'Provide accurate information',
        'Not manipulate rankings or results',
        'Not harass, abuse, or impersonate others',
        'Not attempt to exploit the platform',
      ],
    },
    {
      heading: 'Data Accuracy',
      body: 'Upset provides fight event and competitor information for entertainment and analysis purposes only. We do not guarantee data accuracy or completeness.',
    },
    {
      heading: 'Intellectual Property',
      body: 'All app content, branding, and software belong to Upset.',
    },
    {
      heading: 'Account Termination',
      body: 'We may suspend or terminate accounts for abuse, cheating, or violations of these terms.',
    },
    {
      heading: 'Contact',
      body: 'For questions about these terms: support@upsetapp.com',
    },
  ],
} as const
