'use client'

import { useEffect, useState } from 'react'
import type { JobWithRelations } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TradeBadge, UrgencyBadge } from '@/components/crewup/shared/badges'
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { formatMoney, timeAgo } from '@/components/crewup/shared/format'
import { MapPin, Clock, Users, DollarSign, MessageSquare, Heart } from 'lucide-react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

/** Trade → accent gradient (top-edge bar + hover glow). Stays amber/orange/emerald/rose. */
const TRADE_ACCENT: Record<string, string> = {
  Electrical: 'from-amber-400 to-orange-500',
  Plumbing: 'from-emerald-400 to-teal-500',
  HVAC: 'from-rose-400 to-orange-500',
  Roofing: 'from-stone-500 to-stone-700',
  Concrete: 'from-zinc-400 to-zinc-600',
  Framing: 'from-amber-600 to-yellow-700',
  Painting: 'from-rose-400 to-pink-500',
  Flooring: 'from-amber-700 to-orange-800',
  Masonry: 'from-stone-600 to-amber-800',
  General: 'from-primary to-amber-600',
}

function tradeAccent(trade: string) {
  return TRADE_ACCENT[trade] || TRADE_ACCENT.General
}

export function JobCard({ job }: { job: JobWithRelations }) {
  const openJob = useApp((s) => s.openJob)
  const openProfile = useApp((s) => s.openProfile)
  const user = useApp((s) => s.user)
  const openAuth = useApp((s) => s.openAuth)
  const { toast } = useToast()
  const bidCount = job._count?.bids ?? job.bids?.length ?? 0
  const [fav, setFav] = useState(false)
  const [favLoading, setFavLoading] = useState(false)
  const [pop, setPop] = useState(false)
  const accent = tradeAccent(job.trade)

  // Load favorite state for this job on mount
  useEffect(() => {
    let active = true
    if (!user) return
    ;(async () => {
      try {
        const { favorites } = await api<{ favorites: { job: { id: string } | null }[] }>('/api/favorites?type=job')
        if (!active) return
        setFav(favorites.some((f) => f.job?.id === job.id))
      } catch { /* ignore */ }
    })()
    return () => { active = false }
  }, [user, job.id])

  const toggleFav = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) { openAuth('login'); return }
    setFavLoading(true)
    const wasFav = fav
    setFav(!wasFav)
    if (!wasFav) {
      setPop(true)
      setTimeout(() => setPop(false), 400)
    }
    try {
      if (wasFav) {
        await api(`/api/favorites?jobId=${job.id}`, { method: 'DELETE' })
        toast({ title: 'Removed from saved' })
      } else {
        await api('/api/favorites', { method: 'POST', body: { jobId: job.id } })
        toast({ title: 'Saved to your list ⭐' })
      }
    } catch (e) {
      // revert on error
      setFav(wasFav)
      toast({ title: 'Failed to update', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setFavLoading(false)
    }
  }

  return (
    <Card
      className="group lift-card relative cursor-pointer overflow-hidden p-0 hover:border-primary/30 hover:shadow-lg"
      onClick={() => openJob(job.id)}
    >
      {/* Trade-colored top accent bar that grows on hover */}
      <div className={cn('h-1 w-full bg-gradient-to-r transition-all duration-300 group-hover:h-1.5', accent)} />

      {user && (
        <button
          onClick={toggleFav}
          disabled={favLoading}
          aria-label={fav ? 'Remove from saved' : 'Save job'}
          className={cn(
            'absolute right-3 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/80 backdrop-blur transition-all hover:scale-110',
            fav ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-500'
          )}
        >
          <Heart className={cn('h-4 w-4', fav && 'fill-rose-500', pop && 'animate-heart-pop')} />
        </button>
      )}
      <div className="p-5 pr-12">
        <div className="flex flex-wrap items-center gap-2">
          <TradeBadge trade={job.trade} />
          <Badge variant="outline" className="font-medium">{job.category}</Badge>
          <UrgencyBadge urgency={job.urgency} />
        </div>

        <h3 className="mt-2.5 text-lg font-bold leading-snug transition-colors group-hover:text-primary">{job.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Meta icon={DollarSign} label="Budget">
            <span className="font-semibold">{formatMoney(job.budgetMin)}–{formatMoney(job.budgetMax)}</span>
          </Meta>
          <Meta icon={MapPin} label="Location">
            <span className="truncate">{job.city ? `${job.city}, ${job.state}` : job.location}</span>
          </Meta>
          <Meta icon={Clock} label="Duration">
            <span className="truncate">{job.duration}</span>
          </Meta>
          <Meta icon={Users} label="Crew size">
            <span>{job.crewSize} {job.crewSize === 1 ? 'person' : 'people'}</span>
          </Meta>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3">
        <button
          onClick={(e) => { e.stopPropagation(); openProfile(job.contractor.id) }}
          className="flex items-center gap-2 text-xs transition-opacity hover:opacity-80"
        >
          <UserAvatar user={job.contractor} className="h-6 w-6 ring-1 ring-border" />
          <span className="font-medium hover:underline">{job.contractor.company || job.contractor.name}</span>
        </button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 transition-colors group-hover:text-primary"><MessageSquare className="h-3 w-3" /> {bidCount} bid{bidCount === 1 ? '' : 's'}</span>
          <span>· {timeAgo(job.createdAt)}</span>
        </div>
      </div>
    </Card>
  )
}

function Meta({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md p-1.5 transition-colors group-hover:bg-muted/40">
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  )
}
