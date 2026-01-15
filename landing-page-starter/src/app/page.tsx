import { Hero } from '@/components/Hero'
import { Features } from '@/components/Features'
import { Screenshots } from '@/components/Screenshots'
import { WhyDifferent } from '@/components/WhyDifferent'
import { FinalCTA } from '@/components/FinalCTA'
import { Footer } from '@/components/Footer'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <Screenshots />
      <WhyDifferent />
      <FinalCTA />
      <Footer />
    </main>
  )
}
