'use client'

import { PLANS } from '@/lib/constants'
import { useApp } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Pricing() {
  const router = useRouter()
  const setView = useApp((s) => s.setView)
  const user = useApp((s) => s.user)

  return (
    <section id="pricing" className="border-t border-border bg-secondary/40 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center animate-fade-in-up">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Pricing</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Simple plans that scale with you</h2>
          <p className="mt-3 text-muted-foreground">
            Start free. Upgrade when you&apos;re ready to post more jobs, bid more often, and stand out.
          </p>
        </div>

        <div className="mt-14 grid items-center gap-6 lg:grid-cols-3">
          {PLANS.map((plan, idx) => (
            <Card
              key={plan.id}
              className={cn(
                'relative flex flex-col p-6 sm:p-7 transition-all duration-200 animate-fade-in-up',
                plan.highlight
                  ? 'border-primary bg-gradient-to-b from-primary/5 to-card shadow-[0_24px_60px_-15px_oklch(0.68_0.17_55/0.3)] ring-2 ring-primary lg:scale-[1.04] lg:z-10 animate-glow-pulse'
                  : 'border-border bg-card hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg'
              )}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {plan.highlight && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-amber-500 px-3.5 py-1 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-background">
                  <Sparkles className="mr-1 inline h-3 w-3" /> Most popular
                </span>
              )}
              <div>
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight">${plan.price}</span>
                <span className="text-sm text-muted-foreground">/{plan.period}</span>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <span className={cn(
                      'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full',
                      plan.highlight ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary'
                    )}>
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-7 w-full transition-transform hover:scale-[1.02]"
                variant={plan.highlight ? 'default' : 'outline'}
                onClick={() => {
                  if (!user) router.push('/signup')
                  else if (plan.id === 'FREE') setView('dashboard')
                  else setView('billing')
                }}
              >
                {plan.cta}
              </Button>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          All plans include secure Stripe-powered billing. Cancel anytime.
        </p>
      </div>
    </section>
  )
}
