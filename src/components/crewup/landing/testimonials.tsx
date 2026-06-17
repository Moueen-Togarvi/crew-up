'use client'

import { Star } from 'lucide-react'

const testimonials = [
  {
    quote: 'CrewUp cut the time we spend sourcing subs in half. We posted an electrical build-out and had three qualified bids by lunch.',
    name: 'Marcus Hale',
    role: 'GC, BuildRight Construction Co.',
    rating: 5,
    initials: 'MH',
    color: 'bg-primary/15 text-primary',
    ring: 'ring-primary/30',
  },
  {
    quote: 'As a roofing sub, I used to chase leads constantly. Now the jobs come to me. I&apos;ve closed four contracts in six weeks.',
    name: 'Priya Shah',
    role: 'Owner, Peak Roofing Solutions',
    rating: 5,
    initials: 'PS',
    color: 'bg-amber-400/15 text-amber-600',
    ring: 'ring-amber-400/30',
  },
  {
    quote: 'The messaging and bidding in one place means no more lost emails or texts. Our crew pipeline has never been this organized.',
    name: 'Elena Rossi',
    role: 'Developer, Summit Homes Group',
    rating: 5,
    initials: 'ER',
    color: 'bg-emerald-500/15 text-emerald-600',
    ring: 'ring-emerald-500/30',
  },
]

export function Testimonials() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center animate-fade-in-up">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Trusted on the job site</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Built by pros, for pros</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, idx) => (
            <figure
              key={t.name}
              className="group lift-card relative overflow-hidden rounded-2xl border border-border bg-card p-6 pl-7 shadow-sm transition-transform duration-200 hover:rotate-[0.5deg] animate-fade-in-up"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* left gradient accent bar — full height */}
              <span
                className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-amber-400"
                aria-hidden
              />

              {/* top accent bar — scales in on hover */}
              <span className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-primary via-amber-400 to-primary/60 transition-transform duration-300 group-hover:scale-x-100" aria-hidden />

              {/* oversized decorative quotation mark — top-right, 10% opacity */}
              <span
                className="pointer-events-none absolute -top-3 right-4 select-none font-serif text-7xl leading-none text-primary/10 transition-colors duration-200 group-hover:text-primary/20"
                aria-hidden
              >
                &rdquo;
              </span>

              {/* 5-star rating row */}
              <div className="relative flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="relative mt-4 text-sm leading-relaxed text-foreground">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="relative mt-5 flex items-center gap-3 border-t border-border/60 pt-4">
                <span className="relative">
                  <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold ring-2 ring-offset-2 ring-offset-card ring-primary/20 ${t.color}`}>
                    {t.initials}
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
