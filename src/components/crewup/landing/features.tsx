'use client'

import { ShieldCheck, CreditCard, MessagesSquare, BarChart3, Users, Bell, MapPin, BadgeCheck, ArrowRight } from 'lucide-react'

const features = [
  { icon: ShieldCheck, title: 'Verified crews', desc: 'Every Pro subcontractor is identity-verified with work history and ratings you can trust.', color: 'text-emerald-500' },
  { icon: MessagesSquare, title: 'Built-in messaging', desc: 'Chat with crews in-app, share job details, and keep every conversation organized.', color: 'text-primary' },
  { icon: CreditCard, title: 'Stripe payments', desc: 'Subscribe, upgrade, and manage billing securely with industry-leading payments.', color: 'text-amber-500' },
  { icon: BarChart3, title: 'Pipeline dashboard', desc: 'Track jobs, bids, and active engagements in one clean command center.', color: 'text-rose-500' },
  { icon: Users, title: 'Crew management', desc: 'Build a roster of go-to subcontractors and rehire the ones who deliver.', color: 'text-orange-500' },
  { icon: Bell, title: 'Instant alerts', desc: 'Get notified the moment a relevant job is posted or a bid comes in.', color: 'text-amber-600' },
  { icon: MapPin, title: 'Location-aware', desc: 'Filter jobs and crews by city and state so you only see what&apos;s in range.', color: 'text-emerald-600' },
  { icon: BadgeCheck, title: 'Reviews & reputation', desc: 'Build a track record. Reviews feed your rating and help you win more work.', color: 'text-orange-600' },
]

export function Features() {
  return (
    <section id="features" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center animate-fade-in-up">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Features</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Everything you need to run the job</h2>
          <p className="mt-3 text-muted-foreground">
            From the first bid to the final inspection, BuildUp keeps contractors and subcontractors on the same page.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, idx) => (
            <div
              key={f.title}
              className="group lift-card relative overflow-hidden rounded-2xl border border-border bg-card p-5 animate-pop-in"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              {/* gradient top border — animates width 0 → 100% on hover */}
              <span
                className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-primary to-amber-400 transition-transform duration-300 ease-out group-hover:scale-x-100"
                aria-hidden
              />

              {/* icon container — soft gradient bg, scales + rotates on hover */}
              <span
                className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary/10 to-amber-400/10 ring-1 ring-primary/10 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-3 ${f.color}`}
              >
                <f.icon className="h-5 w-5" />
              </span>

              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>

              {/* "Learn more" — slides in on hover */}
              <a
                href="#features"
                className="mt-4 inline-flex translate-x-[-8px] items-center gap-1 text-sm font-semibold text-primary opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100"
              >
                Learn more
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
