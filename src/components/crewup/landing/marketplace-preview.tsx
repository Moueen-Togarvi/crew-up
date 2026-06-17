'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import type { JobWithRelations } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TradeBadge, UrgencyBadge } from '@/components/crewup/shared/badges'
import { ArrowRight, MapPin, Users, DollarSign, Clock } from 'lucide-react'
import { formatMoney } from '@/components/crewup/shared/format'

export function MarketplacePreview() {
  const setView = useApp((s) => s.setView)
  const setDirectoryRole = useApp((s) => s.setDirectoryRole)
  const [jobs, setJobs] = useState<JobWithRelations[]>([])

  useEffect(() => {
    api<{ jobs: JobWithRelations[] }>('/api/jobs?status=OPEN')
      .then((r) => setJobs(r.jobs.slice(0, 4)))
      .catch(() => {})
  }, [])

  return (
    <section id="marketplace" className="relative border-y border-border bg-secondary/40 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl animate-fade-in-up">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-live-dot" />
              <p className="text-sm font-bold uppercase tracking-wider text-primary">Live marketplace</p>
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Real jobs, posted today</h2>
            <p className="mt-3 text-muted-foreground">
              A snapshot of open work from contractors across the country. Sign up to see the full marketplace and start bidding.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => { setDirectoryRole('SUBCONTRACTOR'); setView('directory') }}
            className="shrink-0 animate-fade-in-up transition-transform hover:scale-[1.02]"
            style={{ animationDelay: '120ms' }}
          >
            Browse all jobs <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {jobs.map((job, idx) => (
            <Card
              key={job.id}
              className="group relative cursor-pointer overflow-hidden p-5 transition-all duration-200 animate-fade-in-up hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_40px_-12px_oklch(0.68_0.17_55/0.22)]"
              style={{ animationDelay: `${160 + idx * 90}ms` }}
              onClick={() => useApp.getState().openJob(job.id)}
            >
              {/* hover accent rail */}
              <span className="absolute inset-y-0 left-0 w-1 origin-top scale-y-0 bg-gradient-to-b from-primary to-amber-400 transition-transform duration-200 group-hover:scale-y-100" aria-hidden />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <TradeBadge trade={job.trade} />
                    <Badge variant="outline" className="font-medium">{job.category}</Badge>
                  </div>
                  <h3 className="mt-2 truncate text-lg font-bold transition-colors group-hover:text-primary">{job.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
                </div>
                <UrgencyBadge urgency={job.urgency} className="shrink-0" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Meta icon={DollarSign} label="Budget">
                  <span className="font-semibold">{formatMoney(job.budgetMin)}–{formatMoney(job.budgetMax)}</span>
                </Meta>
                <Meta icon={MapPin} label="Location">
                  <span className="truncate">{job.city || job.location}</span>
                </Meta>
                <Meta icon={Clock} label="Duration">
                  <span className="truncate">{job.duration}</span>
                </Meta>
                <Meta icon={Users} label="Crew size">
                  <span>{job.crewSize}</span>
                </Meta>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">
                  by <span className="font-medium text-foreground">{job.contractor.company || job.contractor.name}</span>
                </span>
                <Badge variant="secondary" className="gap-1 transition-colors group-hover:bg-primary/15 group-hover:text-primary">
                  {job._count?.bids ?? job.bids.length} bid{(job._count?.bids ?? job.bids.length) === 1 ? '' : 's'}
                </Badge>
              </div>
            </Card>
          ))}
          {jobs.length === 0 && (
            <Card className="col-span-full p-10 text-center text-muted-foreground">
              Loading live jobs from the marketplace…
            </Card>
          )}
        </div>
      </div>
    </section>
  )
}

function Meta({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  )
}
