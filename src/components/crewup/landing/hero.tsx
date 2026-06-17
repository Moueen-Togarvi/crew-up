'use client'

import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ArrowRight, Search, HardHat, Wrench, Hammer, Ruler, ChevronDown, Star, MapPin, TrendingUp, Briefcase, Users, Building2, DollarSign } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { AnimatedNumber } from '@/components/crewup/shared/animated-number'

export function Hero() {
  const openAuth = useApp((s) => s.openAuth)
  const setView = useApp((s) => s.setView)
  const setDirectoryRole = useApp((s) => s.setDirectoryRole)
  const [stats, setStats] = useState({ jobs: 0, subcontractors: 0, contractors: 0, bids: 0 })

  useEffect(() => {
    api('/api/stats').then((s) => setStats(s as { jobs: number; subcontractors: number; contractors: number; bids: number })).catch(() => {})
  }, [])

  const browse = (role: 'SUBCONTRACTOR' | 'CONTRACTOR') => {
    setDirectoryRole(role)
    setView('directory')
  }

  return (
    <section id="top" className="relative overflow-hidden">
      {/* mesh gradient background — soft amber/orange/emerald blobs */}
      <div className="absolute inset-0 mesh-gradient-bg opacity-70" aria-hidden />
      {/* background */}
      <div className="absolute inset-0 bg-grid opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
      {/* Animated floating particles */}
      <div className="absolute top-20 left-1/4 h-3 w-3 animate-float-slow rounded-full bg-primary/20" />
      <div className="absolute top-40 right-1/3 h-2 w-2 animate-float-slow-alt rounded-full bg-amber-400/25" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-32 left-1/3 h-2.5 w-2.5 animate-float-slow rounded-full bg-primary/15" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 right-1/4 h-1.5 w-1.5 animate-float-slow-alt rounded-full bg-amber-500/20" style={{ animationDelay: '3s' }} />
      <div className="absolute bottom-20 right-1/5 h-2 w-2 animate-float-slow rounded-full bg-primary/10" style={{ animationDelay: '0.5s' }} />

      {/* Floating tool icon decorations — slow drift, low opacity */}
      <Hammer className="pointer-events-none absolute left-[6%] top-[28%] hidden h-12 w-12 text-primary opacity-[0.07] animate-float-slow lg:block" style={{ animationDuration: '9s', animationDelay: '0s' }} aria-hidden />
      <HardHat className="pointer-events-none absolute right-[42%] top-[14%] hidden h-11 w-11 text-amber-500 opacity-[0.08] animate-float-slow lg:block" style={{ animationDuration: '11s', animationDelay: '1.5s' }} aria-hidden />
      <Wrench className="pointer-events-none absolute left-[20%] bottom-[14%] hidden h-11 w-11 text-primary opacity-[0.06] animate-float-slow lg:block" style={{ animationDuration: '8s', animationDelay: '0.8s' }} aria-hidden />
      <Ruler className="pointer-events-none absolute right-[8%] bottom-[24%] hidden h-10 w-10 text-amber-600 opacity-[0.07] animate-float-slow lg:block" style={{ animationDuration: '12s', animationDelay: '2.2s' }} aria-hidden />
      <Hammer className="pointer-events-none absolute right-[14%] top-[42%] hidden h-9 w-9 rotate-12 text-primary opacity-[0.05] animate-float-slow lg:block" style={{ animationDuration: '10s', animationDelay: '1s' }} aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: copy */}
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary animate-fade-in-up"
              style={{ animationDelay: '0ms' }}
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              The construction workforce marketplace
            </div>
            <h1
              className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl animate-fade-in-up"
              style={{ animationDelay: '80ms' }}
            >
              Find crews. <br className="hidden sm:block" />
              <span className="text-gradient-primary">Win work.</span> <br className="hidden sm:block" />
              Build together.
            </h1>
            <p
              className="mt-5 max-w-xl text-lg text-muted-foreground animate-fade-in-up"
              style={{ animationDelay: '160ms' }}
            >
              CrewUp connects contractors with vetted subcontractors across the country. Post jobs, compare bids, message crews, and manage your pipeline — all in one place.
            </p>

            <div
              className="mt-7 flex flex-col gap-3 sm:flex-row animate-fade-in-up"
              style={{ animationDelay: '240ms' }}
            >
              <Button size="lg" onClick={() => openAuth('signup')} className="h-12 px-7 text-base font-semibold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]">
                Get started free <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => browse('SUBCONTRACTOR')} className="h-12 px-7 text-base font-semibold">
                <Search className="mr-1.5 h-4 w-4" /> Browse the marketplace
              </Button>
            </div>

            {/* Trust row — quick social proof below CTAs */}
            <div
              className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm animate-fade-in-up"
              style={{ animationDelay: '280ms' }}
            >
              <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                <Users className="h-4 w-4 text-primary" />
                12k+ contractors
              </span>
              <span className="h-4 w-px bg-border/70" aria-hidden />
              <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                <DollarSign className="h-4 w-4 text-primary" />
                $2.4B awarded
              </span>
              <span className="h-4 w-px bg-border/70" aria-hidden />
              <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                4.9 avg rating
              </span>
            </div>

            {/* role quick links */}
            <div
              className="mt-8 grid grid-cols-2 gap-3 sm:max-w-md animate-fade-in-up"
              style={{ animationDelay: '320ms' }}
            >
              <button
                onClick={() => browse('CONTRACTOR')}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary transition-transform group-hover:scale-110">
                  <HardHat className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">I&apos;m a contractor</span>
                  <span className="block text-xs text-muted-foreground">Hire skilled crews</span>
                </span>
              </button>
              <button
                onClick={() => browse('SUBCONTRACTOR')}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary transition-transform group-hover:scale-110">
                  <Wrench className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">I&apos;m a subcontractor</span>
                  <span className="block text-xs text-muted-foreground">Find your next job</span>
                </span>
              </button>
            </div>

            {/* stats */}
            <div
              className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4 animate-fade-in-up"
              style={{ animationDelay: '400ms' }}
            >
              <Stat icon={Briefcase} value={<><AnimatedNumber value={stats.jobs} />+</>} label="Open jobs" />
              <span className="hidden h-9 w-px bg-border/70 sm:block" aria-hidden />
              <Stat icon={Users} value={<><AnimatedNumber value={stats.subcontractors} />+</>} label="Subcontractors" />
              <span className="hidden h-9 w-px bg-border/70 sm:block" aria-hidden />
              <Stat icon={Building2} value={<><AnimatedNumber value={stats.contractors} />+</>} label="Contractors" />
              <span className="hidden h-9 w-px bg-border/70 sm:block" aria-hidden />
              <Stat icon={DollarSign} value={<><AnimatedNumber value={240} format={(n) => `$${Math.round(n)}M`} />+</>} label="Work posted" />
            </div>
          </div>

          {/* Right: image + floating cards */}
          <div className="relative animate-fade-in-scale" style={{ animationDelay: '200ms' }}>
            <div className="relative overflow-hidden rounded-2xl border border-border shadow-[0_24px_60px_-15px_oklch(0.68_0.17_55/0.25),0_8px_24px_-6px_oklch(0.18_0.02_60/0.12)] ring-1 ring-black/5">
              <img
                src="/crewup/hero.png"
                alt="Construction professionals collaborating on site"
                className="aspect-[7/5] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              {/* gradient sheen sweep */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -inset-y-8 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-sheen" />
              </div>
              {/* bottom gradient bar for depth */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary via-amber-400 to-primary/60" />
            </div>

            {/* floating: new job card */}
            <div className="absolute -left-4 top-8 hidden w-60 rounded-xl border border-border bg-gradient-to-br from-card to-card/90 p-3 shadow-[0_12px_32px_-8px_oklch(0.18_0.02_60/0.18),0_4px_12px_-4px_oklch(0.68_0.17_55/0.15)] ring-1 ring-black/5 animate-fade-in-scale animate-float-slow sm:block" style={{ animationDelay: '600ms, 0ms' }}>
              <div className="mb-1.5 h-0.5 w-8 rounded-full bg-gradient-to-r from-primary to-amber-400" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">New job posted</span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-live-dot" />
              </div>
              <p className="mt-1 text-sm font-bold leading-tight">Electrical — Office Build-Out</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Austin, TX · $28k–$42k</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> 3 bids received
              </div>
            </div>

            {/* floating: rating card */}
            <div className="absolute -bottom-5 -right-3 hidden w-56 rounded-xl border border-border bg-gradient-to-br from-card to-card/90 p-3 shadow-[0_12px_32px_-8px_oklch(0.18_0.02_60/0.18),0_4px_12px_-4px_oklch(0.18_0.02_60/0.12)] ring-1 ring-black/5 animate-fade-in-scale animate-float-slow-alt sm:block" style={{ animationDelay: '800ms' }}>
              <div className="mb-1.5 h-0.5 w-8 rounded-full bg-gradient-to-r from-amber-400 to-primary" />
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-400/15 text-amber-500 ring-1 ring-amber-400/20">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                </span>
                <div>
                  <p className="text-sm font-bold">4.9 rating</p>
                  <p className="text-xs text-muted-foreground">Verified crew</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
                <TrendingUp className="h-3 w-3" /> 73 jobs completed
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator — bottom-center chevron with gentle bounce */}
      <a
        href="#features"
        aria-label="Scroll to features"
        className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-muted-foreground transition-colors hover:text-primary sm:flex"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Scroll</span>
        <ChevronDown className="h-5 w-5 animate-scroll-bounce" aria-hidden />
      </a>
    </section>
  )
}

function Stat({ icon: Icon, value, label }: { icon: React.ElementType; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary/12 to-primary/5 text-primary ring-1 ring-primary/10">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-2xl font-extrabold tracking-tight leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
