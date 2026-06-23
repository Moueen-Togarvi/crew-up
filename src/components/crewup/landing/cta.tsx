'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight, Star, ShieldCheck, TrendingUp } from 'lucide-react'

export function CTA() {
  const router = useRouter()
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Mesh-gradient wrapper card — ambient amber/orange/emerald blobs */}
        <div className="relative rounded-[2rem] mesh-gradient-bg p-5 sm:p-8">
          {/* Floating badge decorations — pop in around the wrapper */}
          <span
            className="absolute -top-3 left-8 z-20 inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-xs font-bold text-primary shadow-md ring-1 ring-primary/20 animate-pop-in"
          >
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            Top rated
          </span>
          <span
            className="absolute -top-3 right-10 z-20 hidden items-center gap-1 rounded-full bg-card px-3 py-1 text-xs font-bold text-primary shadow-md ring-1 ring-primary/20 animate-pop-in sm:inline-flex"
            style={{ animationDelay: '120ms' }}
          >
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            Trusted by 12k+
          </span>
          <span
            className="absolute -bottom-3 left-12 z-20 hidden items-center gap-1 rounded-full bg-card px-3 py-1 text-xs font-bold text-primary shadow-md ring-1 ring-primary/20 animate-pop-in sm:inline-flex"
            style={{ animationDelay: '240ms' }}
          >
            <TrendingUp className="h-3 w-3 text-primary" />
            $2.4B awarded
          </span>
          <span
            className="absolute -bottom-3 right-12 z-20 inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-xs font-bold text-primary shadow-md ring-1 ring-primary/20 animate-pop-in"
            style={{ animationDelay: '360ms' }}
          >
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            4.9&#9733; rated
          </span>

          {/* Animated gradient border wrapper — 1.5px gradient that pans horizontally */}
          <div className="relative rounded-3xl bg-gradient-to-r from-primary via-amber-400 to-primary bg-[length:200%_100%] animate-border-pan p-[1.5px] shadow-2xl shadow-primary/20">
            {/* Inner CTA card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-amber-500 to-orange-600 px-6 py-14 text-center text-primary-foreground shadow-2xl shadow-primary/30 sm:px-12 sm:py-20">
              {/* hazard-stripe construction accents (top + bottom) */}
              <div className="hazard-stripe absolute inset-x-0 top-0 h-2.5" aria-hidden />
              <div className="hazard-stripe absolute inset-x-0 bottom-0 h-2.5" aria-hidden />

              {/* layered background flourishes */}
              <div className="absolute inset-0 bg-grid opacity-20" />
              <div className="absolute -top-16 -left-10 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
              <div className="absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-black/15 blur-3xl" />
              <div className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/20 blur-3xl" />

              {/* Subtle noise/blur overlay layer for texture */}
              <div className="absolute inset-0 backdrop-blur-[0.5px] bg-white/[0.02]" aria-hidden />

              {/* sheen sweep */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -inset-y-8 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-sheen" />
              </div>

              <div className="relative mx-auto max-w-2xl pt-2">
                <h2 className="text-3xl font-extrabold tracking-tight drop-shadow-sm sm:text-4xl animate-fade-in-up">
                  Start building your crew today
                </h2>
                <p
                  className="mt-3 text-primary-foreground/90 animate-fade-in-up"
                  style={{ animationDelay: '80ms' }}
                >
                  Join thousands of contractors and subcontractors already using CrewUp to find work, hire crews, and grow their business.
                </p>
                <div
                  className="mt-7 flex flex-col justify-center gap-3 sm:flex-row animate-fade-in-up"
                  style={{ animationDelay: '160ms' }}
                >
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => router.push('/signup')}
                    className="h-12 px-7 text-base font-semibold transition-transform hover:scale-[1.03] animate-pulse-glow"
                  >
                    Create your free account <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => router.push('/login')}
                    className="h-12 px-7 text-base font-semibold border-primary-foreground/40 bg-transparent text-primary-foreground transition-transform hover:scale-[1.03] hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  >
                    I already have an account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
