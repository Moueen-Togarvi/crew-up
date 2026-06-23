'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import type { JobWithRelations, PublicUser } from '@/lib/constants'
import { TRADES, US_STATES } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { JobCard } from '@/components/crewup/shared/job-card'
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { TradeBadge, VerifiedBadge } from '@/components/crewup/shared/badges'
import { Rating } from '@/components/crewup/shared/rating'
import { Search, SlidersHorizontal, Briefcase, Users, MapPin, Loader2, MessageSquare, Heart, X, Sparkles, TrendingUp, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export function DirectoryView() {
  const router = useRouter()
  const directoryRole = useApp((s) => s.directoryRole)
  const setDirectoryRole = useApp((s) => s.setDirectoryRole)
  const user = useApp((s) => s.user)
  const openProfile = useApp((s) => s.openProfile)
  const openJob = useApp((s) => s.openJob)
  const { toast } = useToast()

  const [q, setQ] = useState('')
  const [trade, setTrade] = useState('ALL')
  const [state, setState] = useState('ALL')
  const [sort, setSort] = useState('rating')
  const [jobs, setJobs] = useState<JobWithRelations[]>([])
  const [users, setUsers] = useState<PublicUser[]>([])
  const [loading, setLoading] = useState(true)
  const [favIds, setFavIds] = useState<Set<string>>(new Set())
  const [favBusy, setFavBusy] = useState<Set<string>>(new Set())

  const browsingJobs = directoryRole === 'SUBCONTRACTOR'

  const [tab, setTab] = useState<'jobs' | 'pros'>(browsingJobs ? 'jobs' : 'pros')

  // Load data based on the current tab (not just browsingJobs)
  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        if (tab === 'jobs') {
          const params = new URLSearchParams()
          if (trade !== 'ALL') params.set('trade', trade)
          if (state !== 'ALL') params.set('state', state)
          if (q) params.set('q', q)
          params.set('sort', sort)
          const { jobs } = await api<{ jobs: JobWithRelations[] }>(`/api/jobs?${params}`)
          if (active) setJobs(jobs)
        } else {
          const params = new URLSearchParams()
          if (trade !== 'ALL') params.set('trade', trade)
          if (state !== 'ALL') params.set('state', state)
          if (q) params.set('q', q)
          params.set('sort', sort)
          const { users } = await api<{ users: PublicUser[] }>(`/api/marketplace/subcontractors?${params}`)
          if (active) setUsers(users)
        }
        // Load favorites for the current user
        if (user) {
          try {
            const favType = tab === 'jobs' ? 'job' : 'sub'
            const { favorites } = await api<{ favorites: { targetUser: { id: string } | null; job: { id: string } | null }[] }>(`/api/favorites?type=${favType}`)
            if (active) {
              if (tab === 'pros') {
                setFavIds(new Set(favorites.map((f) => f.targetUser?.id).filter(Boolean) as string[]))
              } else {
                setFavIds(new Set(favorites.map((f) => f.job?.id).filter(Boolean) as string[]))
              }
            }
          } catch { /* ignore */ }
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [tab, trade, state, q, sort, user])

  useEffect(() => {
    setTab(browsingJobs ? 'jobs' : 'pros')
  }, [browsingJobs])

  const toggleSubFav = async (subId: string) => {
    if (!user) { router.push('/login'); return }
    setFavBusy((s) => new Set(s).add(subId))
    const wasFav = favIds.has(subId)
    setFavIds((s) => {
      const next = new Set(s)
      if (wasFav) next.delete(subId)
      else next.add(subId)
      return next
    })
    try {
      if (wasFav) {
        await api(`/api/favorites?targetUserId=${subId}`, { method: 'DELETE' })
        toast({ title: 'Removed from saved' })
      } else {
        await api('/api/favorites', { method: 'POST', body: { targetUserId: subId } })
        toast({ title: 'Saved to your list ⭐' })
      }
    } catch (e) {
      setFavIds((s) => {
        const next = new Set(s)
        if (wasFav) next.add(subId)
        else next.delete(subId)
        return next
      })
      toast({ title: 'Failed to update', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setFavBusy((s) => {
        const next = new Set(s)
        next.delete(subId)
        return next
      })
    }
  }

  const filteredJobs = useMemo(() => jobs.filter((j) => j.status === 'OPEN'), [jobs])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Marketplace</h1>
          <p className="text-sm text-muted-foreground">
            {tab === 'jobs' ? 'Browse open jobs and submit bids.' : 'Browse vetted subcontractors and crews.'}
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-sm">
          <button
            onClick={() => setTab('jobs')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
              tab === 'jobs'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            <Briefcase className="h-4 w-4" /> Jobs
          </button>
          <button
            onClick={() => setTab('pros')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
              tab === 'pros'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            <Users className="h-4 w-4" /> Subcontractors
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tab === 'jobs' ? 'Search jobs by title, description, or location…' : 'Search subcontractors by name, trade, or skills…'}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={trade} onValueChange={setTrade}>
              <SelectTrigger className="w-[150px]"><SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /><SelectValue placeholder="Trade" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="ALL">All trades</SelectItem>
                {TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="w-[120px]"><MapPin className="mr-1.5 h-3.5 w-3.5" /><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="ALL">All states</SelectItem>
                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {tab === 'jobs' ? (
                  <>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="budget">Highest budget</SelectItem>
                    <SelectItem value="urgency">Urgency</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="rating">Top rated</SelectItem>
                    <SelectItem value="jobs">Most jobs</SelectItem>
                    <SelectItem value="rate">Lowest rate</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Active filter chips + result count */}
      {(q || trade !== 'ALL' || state !== 'ALL') && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {loading ? 'Loading…' : tab === 'jobs' ? `${filteredJobs.length} job${filteredJobs.length === 1 ? '' : 's'}` : `${users.length} subcontractor${users.length === 1 ? '' : 's'}`}
          </span>
          {q && (
            <FilterChip label={`"${q}"`} onClear={() => setQ('')} />
          )}
          {trade !== 'ALL' && (
            <FilterChip label={trade} onClear={() => setTrade('ALL')} icon={<SlidersHorizontal className="h-3 w-3" />} />
          )}
          {state !== 'ALL' && (
            <FilterChip label={state} onClear={() => setState('ALL')} icon={<MapPin className="h-3 w-3" />} />
          )}
          <button
            onClick={() => { setQ(''); setTrade('ALL'); setState('ALL') }}
            className="ml-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                <div className="h-5 w-20 animate-pulse rounded bg-muted" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
                <div className="h-8 animate-pulse rounded bg-muted" />
                <div className="h-8 animate-pulse rounded bg-muted" />
                <div className="h-8 animate-pulse rounded bg-muted" />
              </div>
            </Card>
          ))}
        </div>
      ) : tab === 'jobs' ? (
        filteredJobs.length === 0 ? (
          <EmptyState icon={Briefcase} title="No open jobs found" desc="Try adjusting your filters or check back soon — new jobs are posted daily." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredJobs.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        )
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No subcontractors found" desc="Try adjusting your filters to find more crews." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((sub, idx) => (
            <Card
              key={sub.id}
              className="lift-card group relative cursor-pointer overflow-hidden p-0"
              onClick={() => openProfile(sub.id)}
            >
              {/* Top gradient accent */}
              <div className="h-1.5 w-full bg-gradient-to-r from-primary via-amber-400 to-primary/60" />

              {user && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSubFav(sub.id) }}
                  disabled={favBusy.has(sub.id)}
                  aria-label={favIds.has(sub.id) ? 'Remove from saved' : 'Save subcontractor'}
                  className={cn(
                    'absolute right-3 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/80 backdrop-blur transition-all hover:scale-110',
                    favIds.has(sub.id) ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-500'
                  )}
                >
                  <Heart className={cn('h-4 w-4 transition-all', favIds.has(sub.id) && 'fill-rose-500 animate-heart-pop')} />
                </button>
              )}

              <div className="p-5">
                <div className="flex items-start gap-3 pr-8">
                  <div className="relative">
                    <UserAvatar user={sub} className="h-14 w-14 ring-2 ring-primary/20 ring-offset-2 ring-offset-card" />
                    {sub.verified && (
                      <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-card">
                        <Sparkles className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-bold">{sub.name}</p>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{sub.company || sub.trade}</p>
                    <div className="mt-1">
                      <Rating value={sub.rating} count={sub.reviewCount} size="sm" />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <TradeBadge trade={sub.trade || 'General'} />
                  {sub.skills?.split(',').slice(0, 2).map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">{s.trim()}</Badge>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-center">
                  <div>
                    <p className="text-sm font-bold">{sub.jobsCompleted}</p>
                    <p className="text-[10px] text-muted-foreground">Jobs</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{sub.hourlyRate ? `$${sub.hourlyRate}` : '—'}</p>
                    <p className="text-[10px] text-muted-foreground">Rate/hr</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold truncate">{sub.city || '—'}</p>
                    <p className="text-[10px] text-muted-foreground">City</p>
                  </div>
                </div>

                {!user && (
                  <Button size="sm" variant="outline" className="mt-3 w-full" onClick={(e) => { e.stopPropagation(); router.push('/signup') }}>
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Sign up to contact
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <Card className="p-12 text-center">
      <div className="relative mx-auto w-fit">
        <div className="absolute -inset-4 rounded-full bg-muted/50 blur-xl" />
        <Icon className="relative mx-auto h-12 w-12 text-muted-foreground/40" />
      </div>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Card>
  )
}

function FilterChip({ label, onClear, icon }: { label: string; onClear: () => void; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
      {icon}
      {label}
      <button
        onClick={onClear}
        aria-label={`Remove filter ${label}`}
        className="ml-0.5 grid h-3.5 w-3.5 place-items-center rounded-full transition-colors hover:bg-primary/20"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  )
}
