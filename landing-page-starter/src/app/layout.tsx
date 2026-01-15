import type { Metadata } from 'next'
import { Inter, Bebas_Neue } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas-neue'
})

export const metadata: Metadata = {
  title: 'Upset - Track Your Fight Picks',
  description: 'Track your fight picks, prove your fight IQ, and compete with fans around the world. Make predictions, follow fighters, and climb the leaderboards.',
  keywords: ['MMA', 'fight picks', 'predictions', 'leaderboard', 'combat sports', 'fight IQ'],
  openGraph: {
    title: 'Upset - Track Your Fight Picks',
    description: 'Track your fight picks, prove your fight IQ, and compete with fans around the world.',
    type: 'website',
    url: 'https://getupset.app',
    siteName: 'Upset',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Upset - Track Your Fight Picks',
    description: 'Track your fight picks, prove your fight IQ, and compete with fans around the world.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${bebasNeue.variable} font-sans`}>{children}</body>
    </html>
  )
}
