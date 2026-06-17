'use client'

import { LandingNavbar } from './navbar'
import { Hero } from './hero'
import { TrustBand } from './trust-band'
import { HowItWorks } from './how-it-works'
import { Features } from './features'
import { MarketplacePreview } from './marketplace-preview'
import { PlatformPulse } from './platform-pulse'
import { Testimonials } from './testimonials'
import { Pricing } from './pricing'
import { CTA } from './cta'
import { Footer } from './footer'

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNavbar />
      <main className="flex-1">
        <Hero />
        <TrustBand />
        <HowItWorks />
        <Features />
        <MarketplacePreview />
        <PlatformPulse />
        <Testimonials />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
