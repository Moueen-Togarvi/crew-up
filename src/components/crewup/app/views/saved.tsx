'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import type { JobWithRelations, PublicUser } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { JobCard } from '@/components/crewup/shared/job-card'
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { TradeBadge, VerifiedBadge } from '@/components/crewup/shared/badges'
import { Rating } from '@/components/crewup/shared/rating'
import { Heart, Briefcase, Users, Loader2, ArrowRight, Trash2, Search, X, MessageSquare } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SavedJob {
  id: string
  job: JobWithRelations | null
}
interface SavedSub {
  id: string
  targetUser: PublicUser | null
}

type JobSort = 'recent' | 'budget-high' | 'budget-low' | 'title-az'
type SubSort = 'recent' | 'rating' | 'jobs' | 'rate-low' | 'name-az'

export function SavedView() {
  const setView = useApp((s) => s.setView)
  const openProfile = useApp((s) => s.openProfile)
  const openConversation = useApp((s) => s.openConversation)
  const { toast } = useToast()

  const [tab, setTab] = useState<'jobs' | 'subs'>('jobs')
  const [jobs, setJobs] = useState<SavedJob[]>([])
  const [subs, setSubs] = useState<SavedSub[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [jobSort, setJobSort] = useState<JobSort>('recent')
  const [subSort, setSubSort] = useState<SubSort>('recent')
  const [messagingId, setMessagingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [jobsRes, subsRes] = await Promise.all([
        api<{ favorites: SavedJob[] }>('/api/favorites?type=job'),
        api<{ favorites: SavedSub[] }>('/api/favorites?type=sub'),
      ])
      setJobs(jobsRes.favorites)
      setSubs(subsRes.favorites)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const removeJob = async (favId: string, jobId?: string) => {
    setJobs((arr) => arr.filter((f) => f.id !== favId))
    try {
      if (jobId) await api(`/api/favorites?jobId=${jobId}`, { method: 'DELETE' })
      else await api(`/api/favorites?id=${favId}`, { method: 'DELETE' })
      toast({ title: 'Removed from saved' })
    } catch (e) {
      toast({ title: 'Failed to remove', description: (e as Error).message, variant: 'destructive' })
      load()
    }
  }

  const removeSub = async (favId: string, targetUserId?: string) => {
    setSubs((arr) => arr.filter((f) => f.id !== favId))
    try {
      if (targetUserId) await api(`/api/favorites?targetUserId=${targetUserId}`, { method: 'DELETE' })
      else await api(`/api/favorites?id=${favId}`, { method: 'DELETE' })
      toast({ title: 'Removed from saved' })
    } catch (e) {
      toast({ title: 'Failed to remove', description: (e as Error).message, variant: 'destructive' })
      load()
    }
  }

  const messageSub = async (sub: PublicUser) => {
    setMessagingId(sub.id)
    try {
      const { conversationId } = await api<{ conversationId: string }>('/api/messages/conversations', {
        method: 'POST',
        body: { targetUserId: sub.id, body: `Hi ${sub.name.split(' ')[0]}, I'd like to connect.` },
      })
      openConversation(conversationId)
    } catch (e) {
      toast({ title: 'Failed to start conversation', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setMessagingId(null)
    }
  }

  // ---- Derived: filter + sort ----
  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = jobs.filter((f) => {
      if (!f.job) return false
      if (!q) return true
      const j = f.job
      return [j.title, j.trade, j.location, j.city, j.state]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
    const sorted = [...list]
    switch (jobSort) {
      case 'budget-high':
        sorted.sort((a, b) => (b.job!.budgetMax + b.job!.budgetMin) - (a.job!.budgetMax + a.job!.budgetMin))
        break
      case 'budget-low':
        sorted.sort((a, b) => (a.job!.budgetMax + a.job!.budgetMin) - (b.job!.budgetMax + b.job!.budgetMin))
        break
      case 'title-az':
        sorted.sort((a, b) => a.job!.title.localeCompare(b.job!.title))
        break
      case 'recent':
      default:
        break // keep server order
    }
    return sorted
  }, [jobs, query, jobSort])

  const filteredSubs = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = subs.filter((f) => {
      if (!f.targetUser) return false
      if (!q) return true
      const u = f.targetUser
      return [u.name, u.trade, u.company, u.city, u.state, u.skills]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
    const sorted = [...list]
    switch (subSort) {
      case 'rating':
        sorted.sort((a, b) => b.targetUser!.rating - a.targetUser!.rating)
        break
      case 'jobs':
        sorted.sort((a, b) => b.targetUser!.jobsCompleted - a.targetUser!.jobsCompleted)
        break
      case 'rate-low':
        sorted.sort((a, b) => (a.targetUser!.hourlyRate ?? Infinity) - (b.targetUser!.hourlyRate ?? Infinity))
        break
      case 'name-az':
        sorted.sort((a, b) => a.targetUser!.name.localeCompare(b.targetUser!.name))
        break
      case 'recent':
      default:
        break
    }
    return sorted
  }, [subs, query, subSort])

  const totalCount = tab === 'jobs' ? jobs.length : subs.length
  const filteredCount = tab === 'jobs' ? filteredJobs.length : filteredSubs.length
  const showSearchRow = !loading && totalCount > 0
  const searching = query.trim().length > 0

  return (
    <div className="space-y-5">
      {/* Header — gradient accent + total count badge */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-amber-400/5 p-5">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight">
              <Heart className="h-6 w-6 fill-rose-500 text-rose-500" /> Saved
              <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs">
                <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                {jobs.length + subs.length}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">Jobs and subcontractors you&apos;ve bookmarked for later.</p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'jobs' | 'subs')}>
        <TabsList>
          <TabsTrigger value="jobs" className="gap-1.5">
            <Briefcase className="h-3.5 w-3.5" /> Jobs ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="subs" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Subcontractors ({subs.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search + sort row (only when there is data) */}
      {showSearchRow && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={tab === 'jobs'
                  ? 'Search by title, trade, or location…'
                  : 'Search by name, trade, company, or skills…'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-9"
                aria-label="Search saved"
              />
              {searching && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  title="Clear search"
                  className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select
              value={tab === 'jobs' ? jobSort : subSort}
              onValueChange={(v) => (tab === 'jobs' ? setJobSort(v as JobSort) : setSubSort(v as SubSort))}
            >
              <SelectTrigger className="w-full sm:w-[200px]" aria-label="Sort saved">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tab === 'jobs' ? (
                  <>
                    <SelectItem value="recent">Recently saved</SelectItem>
                    <SelectItem value="budget-high">Budget: high to low</SelectItem>
                    <SelectItem value="budget-low">Budget: low to high</SelectItem>
                    <SelectItem value="title-az">Title: A→Z</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="recent">Recently saved</SelectItem>
                    <SelectItem value="rating">Highest rated</SelectItem>
                    <SelectItem value="jobs">Most jobs</SelectItem>
                    <SelectItem value="rate-low">Lowest rate</SelectItem>
                    <SelectItem value="name-az">Name: A→Z</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Result count */}
          <p className="text-xs font-medium text-muted-foreground">
            {searching
              ? `Showing ${filteredCount} of ${totalCount} saved`
              : `${totalCount} saved`}
          </p>
        </>
      )}

      {/* Results */}
      {loading ? (
        tab === 'jobs' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <JobSkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SubSkeletonCard key={i} />)}
          </div>
        )
      ) : tab === 'jobs' ? (
        jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No saved jobs yet"
            desc="Tap the heart icon on any job to save it for later. You'll find it here when you're ready to bid."
            action={() => setView('directory')}
            actionLabel="Browse jobs"
          />
        ) : filteredJobs.length === 0 ? (
          <NoSearchResults query={query} onClear={() => setQuery('')} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredJobs.map((f, idx) => f.job && (
              <div
                key={f.id}
                className="relative animate-stagger-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <JobCard job={f.job} />
                <button
                  onClick={() => removeJob(f.id, f.job?.id)}
                  title="Remove from saved"
                  className="absolute -right-2 -top-2 z-20 grid h-7 w-7 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-md transition-transform hover:scale-110"
                  aria-label="Remove from saved"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )
      ) : subs.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No saved subcontractors yet"
          desc="Tap the heart icon on any subcontractor to save them for later. Build your shortlist of trusted crews."
          action={() => setView('directory')}
          actionLabel="Browse subcontractors"
        />
      ) : filteredSubs.length === 0 ? (
        <NoSearchResults query={query} onClear={() => setQuery('')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubs.map((f, idx) => f.targetUser && (
            <Card
              key={f.id}
              className="lift-card relative animate-stagger-in overflow-hidden p-0"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Gradient top accent bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-primary to-amber-400" />
              <button
                onClick={() => removeSub(f.id, f.targetUser?.id)}
                title="Remove from saved"
                className="absolute right-3 top-4 z-20 grid h-7 w-7 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-md transition-transform hover:scale-110"
                aria-label="Remove from saved"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <div className="p-5">
                <button
                  onClick={() => openProfile(f.targetUser!.id)}
                  className="flex w-full items-start gap-3 pr-8 text-left"
                >
                  <UserAvatar user={f.targetUser} className="h-12 w-12" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-bold">{f.targetUser.name}</p>
                      {f.targetUser.verified && <VerifiedBadge className="px-1.5 py-0" />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{f.targetUser.company || f.targetUser.trade}</p>
                    <Rating value={f.targetUser.rating} count={f.targetUser.reviewCount} className="mt-1" />
                  </div>
                </button>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <TradeBadge trade={f.targetUser.trade || 'General'} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                  <div><p className="text-sm font-bold">{f.targetUser.jobsCompleted}</p><p className="text-[10px] text-muted-foreground">Jobs</p></div>
                  <div><p className="text-sm font-bold">{f.targetUser.hourlyRate ? `$${f.targetUser.hourlyRate}` : '—'}</p><p className="text-[10px] text-muted-foreground">Rate/hr</p></div>
                  <div><p className="truncate text-sm font-bold">{f.targetUser.city || '—'}</p><p className="text-[10px] text-muted-foreground">City</p></div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => messageSub(f.targetUser!)}
                    disabled={messagingId === f.targetUser!.id}
                  >
                    {messagingId === f.targetUser!.id
                      ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      : <MessageSquare className="mr-1.5 h-3.5 w-3.5" />}
                    Message
                  </Button>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => openProfile(f.targetUser!.id)}>
                    View profile <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, title, desc, action, actionLabel }: { icon: React.ElementType; title: string; desc: string; action?: () => void; actionLabel?: string }) {
  return (
    <Card className="p-12 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-500/10">
        <Icon className="h-8 w-8 text-rose-500/60" />
      </div>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 max-w-sm mx-auto text-sm text-muted-foreground">{desc}</p>
      {action && actionLabel && (
        <Button className="mt-4" onClick={action}>{actionLabel}</Button>
      )}
    </Card>
  )
}

function NoSearchResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <Card className="p-12 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-muted">
        <Search className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <p className="mt-4 font-semibold">No matches for &ldquo;{query}&rdquo;</p>
      <p className="mt-1 mx-auto max-w-sm text-sm text-muted-foreground">
        Try a different keyword or clear your search to see everything you&apos;ve saved.
      </p>
      <Button className="mt-4" variant="outline" onClick={onClear}>
        <X className="mr-1.5 h-4 w-4" /> Clear search
      </Button>
    </Card>
  )
}

/** Skeleton mimicking the JobCard layout (top accent, badges, title, body, 4-col meta, footer). */
function JobSkeletonCard() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="h-1 w-full shimmer" />
      <div className="p-5 pr-12">
        <div className="flex flex-wrap gap-2">
          <div className="h-5 w-16 rounded-full shimmer" />
          <div className="h-5 w-20 rounded-full shimmer" />
          <div className="h-5 w-14 rounded-full shimmer" />
        </div>
        <div className="mt-3 h-5 w-3/4 rounded shimmer" />
        <div className="mt-2 h-3 w-full rounded shimmer" />
        <div className="mt-1.5 h-3 w-2/3 rounded shimmer" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-md p-1.5">
              <div className="h-2.5 w-10 rounded shimmer" />
              <div className="mt-1.5 h-3.5 w-14 rounded shimmer" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full shimmer" />
          <div className="h-3 w-20 rounded shimmer" />
        </div>
        <div className="h-3 w-16 rounded shimmer" />
      </div>
    </Card>
  )
}

/** Skeleton mimicking the saved subcontractor card layout. */
function SubSkeletonCard() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="h-1.5 w-full shimmer" />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 rounded-full shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded shimmer" />
            <div className="h-3 w-1/2 rounded shimmer" />
            <div className="h-3 w-1/3 rounded shimmer" />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <div className="h-5 w-16 rounded-full shimmer" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="mx-auto h-3.5 w-10 rounded shimmer" />
              <div className="mx-auto mt-1 h-2 w-8 rounded shimmer" />
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="h-8 rounded-md shimmer" />
          <div className="h-8 rounded-md shimmer" />
        </div>
      </div>
    </Card>
  )
}
