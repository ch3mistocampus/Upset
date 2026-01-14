import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Upset - Track Your UFC Picks',
  description: 'Track your UFC picks, prove your fight IQ, and compete with friends on leaderboards. Coming soon to iOS and Android.',
  keywords: ['UFC', 'MMA', 'fight picks', 'predictions', 'leaderboard'],
  openGraph: {
    title: 'Upset - Track Your UFC Picks',
    description: 'Track your UFC picks, prove your fight IQ, and compete with friends.',
    type: 'website',
    url: 'https://getupset.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Upset - Track Your UFC Picks',
    description: 'Track your UFC picks, prove your fight IQ, and compete with friends.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
