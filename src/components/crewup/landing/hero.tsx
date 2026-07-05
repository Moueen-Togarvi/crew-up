'use client'

import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ArrowRight, Search, HardHat, Wrench, Hammer, Ruler, ChevronDown, Star, MapPin, TrendingUp, Briefcase, Users, Building2, DollarSign } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { AnimatedNumber } from '@/components/crewup/shared/animated-number'

export function Hero() {
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
      {/* background container pushed back */}
      <div className="absolute inset-0 z-[-1] pointer-events-none">
        <div className="absolute inset-0 mesh-gradient-bg opacity-70" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute top-20 left-1/4 h-3 w-3 animate-float-slow rounded-full bg-primary/20" />
        <div className="absolute top-40 right-1/3 h-2 w-2 animate-float-slow-alt rounded-full bg-amber-400/25" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-32 left-1/3 h-2.5 w-2.5 animate-float-slow rounded-full bg-primary/15" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/4 h-1.5 w-1.5 animate-float-slow-alt rounded-full bg-amber-500/20" style={{ animationDelay: '3s' }} />
        <div className="absolute bottom-20 right-1/5 h-2 w-2 animate-float-slow rounded-full bg-primary/10" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Right side absolute full-bleed image with explicit z-index to guarantee visibility */}
      <div 
        className="absolute inset-y-0 right-0 w-full lg:w-[50vw] z-0"
        style={{ 
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 25%, black 90%, transparent 100%)',
          maskImage: 'linear-gradient(to right, transparent 0%, black 25%, black 90%, transparent 100%)' 
        }}
      >
        <img
          src="/buildup/hero-ai.png"
          alt="Construction professionals"
          className="h-full w-full object-cover object-[70%_center]"
        />
      </div>

      {/* Floating tool icon decorations */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Hammer className="absolute left-[6%] top-[28%] hidden h-12 w-12 text-primary opacity-[0.07] animate-float-slow lg:block" style={{ animationDuration: '9s', animationDelay: '0s' }} aria-hidden />
        <HardHat className="absolute right-[42%] top-[14%] hidden h-11 w-11 text-amber-500 opacity-[0.08] animate-float-slow lg:block" style={{ animationDuration: '11s', animationDelay: '1.5s' }} aria-hidden />
        <Wrench className="absolute left-[20%] bottom-[14%] hidden h-11 w-11 text-primary opacity-[0.06] animate-float-slow lg:block" style={{ animationDuration: '8s', animationDelay: '0.8s' }} aria-hidden />
        <Ruler className="absolute right-[8%] bottom-[24%] hidden h-10 w-10 text-amber-600 opacity-[0.07] animate-float-slow lg:block" style={{ animationDuration: '12s', animationDelay: '2.2s' }} aria-hidden />
        <Hammer className="absolute right-[14%] top-[42%] hidden h-9 w-9 rotate-12 text-primary opacity-[0.05] animate-float-slow lg:block" style={{ animationDuration: '10s', animationDelay: '1s' }} aria-hidden />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
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
              BuildUp connects contractors with vetted subcontractors across the country. Post jobs, compare bids, message crews, and manage your pipeline — all in one place.
            </p>

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
              className="mt-9 flex items-center justify-between gap-2 w-full animate-fade-in-up"
              style={{ animationDelay: '400ms' }}
            >
              <Stat icon={Briefcase} value={<><AnimatedNumber value={stats.jobs} />+</>} label="Open jobs" />
              <Stat icon={Users} value={<><AnimatedNumber value={stats.subcontractors} />+</>} label="Subcontractors" />
              <Stat icon={Building2} value={<><AnimatedNumber value={stats.contractors} />+</>} label="Contractors" />
              <Stat icon={DollarSign} value={<><AnimatedNumber value={240} format={(n) => `$${Math.round(n)}M`} />+</>} label="Work posted" />
            </div>
          </div>

          {/* Right: Empty column for layout spacing */}
          <div className="hidden lg:block"></div>
        </div>
      </div>
    </section>
  )
}

function Stat({ icon: Icon, value, label }: { icon: React.ElementType; value: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary/12 to-primary/5 text-primary ring-1 ring-primary/10">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-lg sm:text-xl font-extrabold tracking-tight leading-none">{value}</p>
        <p className="mt-1 flex flex-col sm:inline text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">{label}</p>
      </div>
    </div>
  )
}
