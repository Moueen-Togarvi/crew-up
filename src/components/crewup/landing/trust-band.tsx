'use client'

import { Zap, Flame, Droplets, Wind, Layers, Paintbrush, Hammer, HardHat, Wrench, Snowflake, Mountain, Trees } from 'lucide-react'

const TRADES = [
  { icon: Zap, label: 'Electrical' },
  { icon: Droplets, label: 'Plumbing' },
  { icon: Hammer, label: 'Framing' },
  { icon: Mountain, label: 'Roofing' },
  { icon: Layers, label: 'Concrete' },
  { icon: Snowflake, label: 'HVAC' },
  { icon: Paintbrush, label: 'Painting' },
  { icon: Wind, label: 'Drywall' },
  { icon: Trees, label: 'Landscaping' },
  { icon: Flame, label: 'Welding' },
  { icon: HardHat, label: 'General' },
  { icon: Wrench, label: 'Maintenance' },
]

export function TrustBand() {
  return (
    <section className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Every trade. Every project. One platform.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-x-4 gap-y-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12">
          {TRADES.map((t, idx) => (
            <div
              key={t.label}
              className="group flex flex-col items-center gap-1.5 rounded-lg p-2 text-center transition-colors hover:bg-background animate-fade-in-up"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 text-primary ring-1 ring-primary/10 transition-transform duration-200 group-hover:scale-110 group-hover:bg-primary/15">
                <t.icon className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                {t.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
