'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import type { JobWithRelations, PublicUser, BidWithUser } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { TradeBadge, StatusBadge, UrgencyBadge, VerifiedBadge } from '@/components/crewup/shared/badges'
import { Rating } from '@/components/crewup/shared/rating'
import { formatMoney, timeAgo } from '@/components/crewup/shared/format'
import { Briefcase, FilePlus2, DollarSign, TrendingUp, ArrowRight, MessageSquare, CheckCircle2, Clock, MapPin, Wrench, HardHat, User, Bell, Activity, Target, Zap, Sparkles } from 'lucide-react'
import { AnimatedNumber } from '@/components/crewup/shared/animated-number'
import { StatCard, StatCardSkeleton } from '@/components/crewup/shared/stat-card'
import { ProfileCompletionBanner } from '@/components/crewup/app/profile-completion-banner'
import { cn } from '@/lib/utils'

interface NotifItem {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  read: boolean
  createdAt: string
}

const NOTIF_ICON_MAP: Record<string, { icon: string; tint: string }> = {
  NEW_BID: { icon: '🛠️', tint: 'bg-amber-400/15' },
  BID_ACCEPTED: { icon: '🎉', tint: 'bg-emerald-500/15' },
  BID_REJECTED: { icon: '📨', tint: 'bg-muted' },
  NEW_MESSAGE: { icon: '💬', tint: 'bg-sky-500/15' },
  NEW_REVIEW: { icon: '⭐', tint: 'bg-amber-400/15' },
  JOB_ASSIGNED: { icon: '✅', tint: 'bg-emerald-500/15' },
}

export function DashboardView() {
  const user = useApp((s) => s.user)!
  const setView = useApp((s) => s.setView)
  const openJob = useApp((s) => s.openJob)
  const openProfile = useApp((s) => s.openProfile)

  const [myJobs, setMyJobs] = useState<JobWithRelations[]>([])
  const [myBids, setMyBids] = useState<(BidWithUser & { job?: JobWithRelations })[]>([])
  const [topSubs, setTopSubs] = useState<PublicUser[]>([])
  const [notifs, setNotifs] = useState<NotifItem[]>([])
  const [allJobs, setAllJobs] = useState<JobWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const [jobsRes, subsRes, notifsRes] = await Promise.all([
          api<{ jobs: JobWithRelations[] }>('/api/jobs'),
          api<{ users: PublicUser[] }>('/api/marketplace/subcontractors'),
          api<{ notifications: NotifItem[]; unreadCount: number }>('/api/notifications?limit=6'),
        ])
        if (!active) return
        setAllJobs(jobsRes.jobs)
        if (user.role === 'CONTRACTOR') {
          setMyJobs(jobsRes.jobs.filter((j) => j.contractorId === user.id))
        } else {
          const allBids = jobsRes.jobs.flatMap((j) => j.bids.filter((b) => b.subcontractorId === user.id).map((b) => ({ ...b, job: j })))
          setMyBids(allBids)
        }
        setTopSubs(subsRes.users.slice(0, 4))
        setNotifs(notifsRes.notifications)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [user.id, user.role])

  const isContractor = user.role === 'CONTRACTOR'

  const openJobs = myJobs.filter((j) => j.status === 'OPEN').length
  const assignedJobs = myJobs.filter((j) => j.status === 'ASSIGNED').length
  const completedJobs = myJobs.filter((j) => j.status === 'COMPLETED').length
  const totalJobs = myJobs.length || 1
  const pipelineValue = myJobs.reduce((a, j) => a + j.budgetMax, 0)
  const totalBids = myJobs.reduce((a, j) => a + (j._count?.bids ?? j.bids.length), 0)

  const pendingBids = myBids.filter((b) => b.status === 'PENDING').length
  const acceptedBids = myBids.filter((b) => b.status === 'ACCEPTED').length
  const rejectedBids = myBids.filter((b) => b.status === 'REJECTED').length

  // Recommended jobs for subcontractors (trade match > state match > recency)
  const recommendedJobs = useMemo(() => {
    if (isContractor) return []
    const userTrade = user.trade?.trim().toLowerCase()
    const userState = user.state?.trim()
    const alreadyBidIds = new Set(myBids.map((b) => b.jobId))
    const now = Date.now()
    const scored = allJobs
      .filter((j) => j.status === 'OPEN' && j.contractorId !== user.id && !alreadyBidIds.has(j.id))
      .map((j) => {
        let score = 0
        if (userTrade && j.trade?.trim().toLowerCase() === userTrade) score += 1000
        if (userState && j.state?.trim() === userState) score += 100
        const ageDays = (now - new Date(j.createdAt).getTime()) / 86_400_000
        score += Math.max(0, 50 - ageDays)
        return { job: j, score }
      })
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, 4).map((s) => s.job)
  }, [allJobs, myBids, isContractor, user.id, user.trade, user.state])

  const stats = isContractor
    ? [
        { label: 'Open jobs', value: String(openJobs), numericValue: openJobs, icon: Briefcase, color: 'text-primary', gradient: 'from-primary/15 to-primary/5', progress: Math.round((openJobs / totalJobs) * 100) },
        { label: 'Active bids', value: String(totalBids), numericValue: totalBids, icon: TrendingUp, color: 'text-amber-600', gradient: 'from-amber-400/20 to-amber-500/5', progress: Math.min(100, totalBids * 10) },
        { label: 'Assigned', value: String(assignedJobs), numericValue: assignedJobs, icon: CheckCircle2, color: 'text-emerald-600', gradient: 'from-emerald-400/20 to-emerald-500/5', progress: Math.round((assignedJobs / totalJobs) * 100) },
        { label: 'Pipeline value', value: formatMoney(pipelineValue), numericValue: pipelineValue, icon: DollarSign, color: 'text-rose-600', gradient: 'from-rose-400/20 to-rose-500/5', format: (n: number) => formatMoney(n), progress: Math.min(100, Math.round(pipelineValue / 500000 * 100)) },
      ]
    : [
        { label: 'Active bids', value: String(myBids.length), numericValue: myBids.length, icon: TrendingUp, color: 'text-primary', gradient: 'from-primary/15 to-primary/5', progress: Math.min(100, myBids.length * 12) },
        { label: 'Pending', value: String(pendingBids), numericValue: pendingBids, icon: Clock, color: 'text-amber-600', gradient: 'from-amber-400/20 to-amber-500/5', progress: myBids.length > 0 ? Math.round((pendingBids / myBids.length) * 100) : 0 },
        { label: 'Accepted', value: String(acceptedBids), numericValue: acceptedBids, icon: CheckCircle2, color: 'text-emerald-600', gradient: 'from-emerald-400/20 to-emerald-500/5', progress: myBids.length > 0 ? Math.round((acceptedBids / myBids.length) * 100) : 0 },
        { label: 'Jobs done', value: String(user.jobsCompleted), numericValue: user.jobsCompleted, icon: Briefcase, color: 'text-rose-600', gradient: 'from-rose-400/20 to-rose-500/5', progress: Math.min(100, user.jobsCompleted * 5) },
      ]

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary via-amber-600 to-orange-600 p-6 text-primary-foreground shadow-lg shadow-primary/20 sm:p-8">
        <div className="absolute inset-0 bg-grid opacity-15" />
        {/* Mesh gradient overlay — subtle multi-color radial mesh (Task 9-b) */}
        <div className="mesh-gradient-bg pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl" />
        {/* Animated accent dots */}
        <div className="absolute right-20 top-12 h-2 w-2 animate-live-dot rounded-full bg-white/40" />
        <div className="absolute right-32 top-16 h-1.5 w-1.5 animate-live-dot rounded-full bg-white/30" style={{ animationDelay: '0.5s' }} />
        <div className="absolute right-16 top-20 h-1 w-1 animate-live-dot rounded-full bg-white/20" style={{ animationDelay: '1s' }} />
        {/* Hazard accent bar at top */}
        <div className="hazard-stripe absolute inset-x-0 top-0 h-1 opacity-80" />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                {isContractor ? <HardHat className="h-6 w-6" /> : <Wrench className="h-6 w-6" />}
              </span>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight drop-shadow-sm sm:text-3xl">{user.name}</h1>
                <p className="flex items-center gap-1.5 text-sm text-primary-foreground/90">
                  <span className="inline-block h-1.5 w-1.5 animate-live-dot rounded-full bg-white" />
                  {isContractor ? 'Contractor dashboard' : `${user.trade || 'Subcontractor'} dashboard`}
                </p>
              </div>
            </div>
            <p className="mt-3 max-w-md text-sm text-primary-foreground/90">
              {isContractor
                ? 'Track your posted jobs, review incoming bids, and manage your active crews.'
                : 'Track your bids, find new work, and grow your reputation on BuildUp.'}
            </p>
          </div>
          {/* CTAs — pop-in with staggered delays (Task 9-b) */}
          <div className="flex shrink-0 items-center gap-2">
            {isContractor ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setView('post-job')}
                  className="sweep-on-hover animate-pop-in shadow-lg"
                  style={{ animationDelay: '100ms' }}
                >
                  <FilePlus2 className="mr-1.5 h-4 w-4" /> Post a job
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setView('directory')}
                  className="animate-pop-in border border-white/20 bg-white/10 text-primary-foreground backdrop-blur-sm hover:bg-white/20 hover:text-primary-foreground"
                  style={{ animationDelay: '200ms' }}
                >
                  Browse directory <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setView('directory')}
                  className="sweep-on-hover animate-pop-in shadow-lg"
                  style={{ animationDelay: '100ms' }}
                >
                  <Briefcase className="mr-1.5 h-4 w-4" /> Find work
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setView('marketplace')}
                  className="animate-pop-in border border-white/20 bg-white/10 text-primary-foreground backdrop-blur-sm hover:bg-white/20 hover:text-primary-foreground"
                  style={{ animationDelay: '200ms' }}
                >
                  My bids <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Gradient divider above stats (Task 9-b) */}
      <div className="bg-gradient-to-r from-transparent via-primary/20 to-transparent h-px" aria-hidden="true" />

      {/* Profile completion banner (Task 8-c) */}
      <ProfileCompletionBanner user={user} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          <StatCardSkeleton count={4} />
        ) : (
          stats.map((s, i) => (
            <div key={s.label} className="animate-pop-in" style={{ animationDelay: `${i * 60}ms` }}>
              <Card className="group relative overflow-hidden p-5 transition-all hover:shadow-md hover:border-primary/20">
                {/* Gradient background accent */}
                <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100', s.gradient)} />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className={cn('grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br text-white', s.gradient)}>
                      <s.icon className="h-4 w-4" />
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-normal">{s.label}</Badge>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-extrabold tracking-tight">
                      <AnimatedNumber value={s.numericValue} format={s.format} />
                    </p>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{s.progress}%</span>
                    </div>
                    <Progress value={s.progress} className="h-1.5" />
                  </div>
                </div>
              </Card>
            </div>
          ))
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {isContractor ? (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border p-5">
                <div>
                  <h3 className="font-bold">Your active jobs</h3>
                  <p className="text-xs text-muted-foreground">Jobs you&apos;ve posted</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setView('marketplace')}>View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
              </div>
              <div className="divide-y divide-border">
                {loading && (
                  <div className="divide-y divide-border">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2"><span className="h-5 w-16 animate-pulse rounded bg-muted" /><span className="h-5 w-20 animate-pulse rounded bg-muted" /></div>
                          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                        </div>
                        <div className="space-y-1 text-right">
                          <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
                          <div className="ml-auto h-3 w-10 animate-pulse rounded bg-muted" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!loading && myJobs.length === 0 && (
                  <div className="p-10 text-center">
                    <div className="relative mx-auto w-fit">
                      <div className="absolute -inset-3 rounded-full bg-primary/10 blur-xl" />
                      <Briefcase className="relative mx-auto h-12 w-12 text-primary/60" />
                    </div>
                    <p className="mt-4 text-sm font-bold">No jobs posted yet</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">Post your first job to start receiving bids from vetted subcontractors.</p>
                    <Button size="sm" className="mt-4 sweep-on-hover" onClick={() => setView('post-job')}><FilePlus2 className="mr-1.5 h-4 w-4" /> Post a job</Button>
                  </div>
                )}
                {myJobs.slice(0, 5).map((job) => (
                  <button key={job.id} onClick={() => openJob(job.id)} className="group flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-accent/50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <TradeBadge trade={job.trade} />
                        <StatusBadge status={job.status} />
                      </div>
                      <p className="mt-1.5 truncate font-semibold group-hover:text-primary transition-colors">{job.title}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {job.city || job.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatMoney(job.budgetMin)}–{formatMoney(job.budgetMax)}</p>
                      <p className="text-xs text-muted-foreground">{job._count?.bids ?? job.bids.length} bid{(job._count?.bids ?? job.bids.length) === 1 ? '' : 's'}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border p-5">
                <div>
                  <h3 className="font-bold">Your recent bids</h3>
                  <p className="text-xs text-muted-foreground">Jobs you&apos;ve bid on</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setView('marketplace')}>View all <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
              </div>
              <div className="divide-y divide-border">
                {loading && (
                  <div className="divide-y divide-border">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2"><span className="h-5 w-16 animate-pulse rounded bg-muted" /><span className="h-5 w-20 animate-pulse rounded bg-muted" /></div>
                          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                        </div>
                        <div className="space-y-1 text-right">
                          <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
                          <div className="ml-auto h-3 w-10 animate-pulse rounded bg-muted" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!loading && myBids.length === 0 && (
                  <div className="p-10 text-center">
                    <div className="relative mx-auto w-fit">
                      <div className="absolute -inset-3 rounded-full bg-emerald-500/10 blur-xl" />
                      <TrendingUp className="relative mx-auto h-12 w-12 text-emerald-600/60" />
                    </div>
                    <p className="mt-4 text-sm font-bold">No bids yet</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">Browse open jobs and submit your first bid to start winning work.</p>
                    <Button size="sm" className="mt-4 sweep-on-hover" onClick={() => setView('directory')}><Briefcase className="mr-1.5 h-4 w-4" /> Find work</Button>
                  </div>
                )}
                {myBids.slice(0, 5).map((bid) => (
                  <button key={bid.id} onClick={() => bid.job && openJob(bid.job.id)} className="group flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-accent/50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <TradeBadge trade={bid.job?.trade || ''} />
                        <StatusBadge status={bid.status} />
                      </div>
                      <p className="mt-1.5 truncate font-semibold group-hover:text-primary transition-colors">{bid.job?.title}</p>
                      <p className="text-xs text-muted-foreground">Bid placed {timeAgo(bid.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatMoney(bid.amount)}</p>
                      <p className="text-xs text-muted-foreground">{bid.duration}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Recommended jobs for subcontractors */}
          {!isContractor && !loading && (
            <Card className="overflow-hidden animate-fade-in-up" style={{ animationDelay: '60ms' }}>
              <div className="h-1 w-full bg-gradient-to-r from-primary to-amber-400" />
              <div className="flex items-center justify-between border-b border-border p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-400/15 text-amber-600">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-bold">Recommended for you</h3>
                    <p className="text-xs text-muted-foreground">Jobs matching your trade</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setView('directory')}>Browse all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
              </div>
              <div className="divide-y divide-border">
                {recommendedJobs.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="relative mx-auto w-fit">
                      <div className="absolute -inset-3 rounded-full bg-amber-400/10 blur-xl" />
                      <Sparkles className="relative mx-auto h-10 w-10 text-amber-500/60" />
                    </div>
                    <p className="mt-3 text-sm font-bold">No matching jobs right now</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">We couldn&apos;t find open jobs matching your trade. Browse the full marketplace to find work.</p>
                    <Button size="sm" className="mt-3 sweep-on-hover" onClick={() => setView('directory')}><Briefcase className="mr-1.5 h-4 w-4" /> Browse all jobs</Button>
                  </div>
                ) : (
                  recommendedJobs.map((job, i) => (
                    <div key={job.id} className="animate-stagger-in" style={{ animationDelay: `${i * 60 + 80}ms` }}>
                      <div className="group flex items-center gap-3 p-3.5 transition-colors hover:bg-accent/50">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <TradeBadge trade={job.trade} className="py-0 text-[10px]" />
                            <UrgencyBadge urgency={job.urgency} className="py-0 text-[10px]" />
                          </div>
                          <p className="mt-1 truncate text-sm font-semibold group-hover:text-primary transition-colors">{job.title}</p>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="flex min-w-0 items-center gap-0.5 truncate"><MapPin className="h-3 w-3 shrink-0" />{job.city || job.location}</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="whitespace-nowrap font-medium text-foreground/80">{formatMoney(job.budgetMin)}–{formatMoney(job.budgetMax)}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0" onClick={() => openJob(job.id)}>
                          View <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {/* Bid success rate donut — subcontractor-only widget (Task 9-b) */}
          {!isContractor && !loading && myBids.length > 0 && (
            <Card className="overflow-hidden animate-fade-in-up-sm" style={{ animationDelay: '120ms' }}>
              <div className="border-b border-border p-5">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="font-bold">Bid success rate</h3>
                    <p className="text-xs text-muted-foreground">Acceptance breakdown</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-5 p-5 sm:flex-row sm:gap-6">
                <BidSuccessDonut accepted={acceptedBids} pending={pendingBids} rejected={rejectedBids} />
                <div className="w-full flex-1 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Accepted</span>
                    <span className="font-semibold">{acceptedBids}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-amber-400" /> Pending</span>
                    <span className="font-semibold">{pendingBids}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-rose-500" /> Rejected</span>
                    <span className="font-semibold">{rejectedBids}</span>
                  </div>
                  <div className="mt-1 border-t border-border pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total bids</span>
                      <span className="font-semibold">{myBids.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Quick actions for contractors - pipeline overview */}
          {isContractor && !loading && myJobs.length > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b border-border p-5">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="font-bold">Pipeline overview</h3>
                    <p className="text-xs text-muted-foreground">Your job funnel at a glance</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2">
                  {/* Pipeline visual */}
                  <div className="flex flex-1 items-center">
                    <div className="relative flex-1">
                      <div className="h-8 rounded-l-full bg-primary/20 overflow-hidden">
                        <div className="h-full bg-primary/50 transition-all" style={{ width: `${totalJobs > 0 ? (openJobs / totalJobs) * 100 : 0}%` }} />
                      </div>
                      <p className="absolute inset-0 flex items-center justify-center text-xs font-semibold">{openJobs} Open</p>
                    </div>
                    <div className="relative flex-1">
                      <div className="h-8 bg-amber-400/20 overflow-hidden">
                        <div className="h-full bg-amber-400/50 transition-all" style={{ width: `${totalJobs > 0 ? (assignedJobs / totalJobs) * 100 : 0}%` }} />
                      </div>
                      <p className="absolute inset-0 flex items-center justify-center text-xs font-semibold">{assignedJobs} Assigned</p>
                    </div>
                    <div className="relative flex-1">
                      <div className="h-8 rounded-r-full bg-emerald-500/20 overflow-hidden">
                        <div className="h-full bg-emerald-500/50 transition-all" style={{ width: `${totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0}%` }} />
                      </div>
                      <p className="absolute inset-0 flex items-center justify-center text-xs font-semibold">{completedJobs} Done</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="font-bold text-gradient-primary">{formatMoney(pipelineValue)}</span>
                  <span className="text-xs text-muted-foreground">total pipeline value</span>
                </div>
                {/* Bid activity sparkline */}
                <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-amber-400/5 p-3 ring-1 ring-amber-400/15">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
                      <TrendingUp className="h-3.5 w-3.5 shrink-0" /> Bid activity
                    </p>
                    <p className="text-[10px] text-muted-foreground">Bids across {myJobs.length} job{myJobs.length === 1 ? '' : 's'}</p>
                  </div>
                  <BidActivitySparkline data={myJobs.map((j) => j._count?.bids ?? j.bids.length)} />
                </div>
              </div>
            </Card>
          )}

          {/* Activity heatmap — contractor-only widget (Task 9-b) */}
          {isContractor && !loading && (
            <Card className="overflow-hidden animate-fade-in-up-sm" style={{ animationDelay: '120ms' }}>
              <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="font-bold">Activity heatmap</h3>
                    <p className="text-xs text-muted-foreground">Last 5 weeks</p>
                  </div>
                </div>
                {/* Legend — Less → More */}
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span>Less</span>
                  <span className="h-3 w-3 rounded-sm bg-muted" />
                  <span className="h-3 w-3 rounded-sm bg-primary/20" />
                  <span className="h-3 w-3 rounded-sm bg-primary/40" />
                  <span className="h-3 w-3 rounded-sm bg-primary/60" />
                  <span className="h-3 w-3 rounded-sm bg-primary" />
                  <span>More</span>
                </div>
              </div>
              <div className="p-5">
                <div className="grid w-fit grid-cols-7 gap-1" role="img" aria-label="Activity intensity over the last 5 weeks">
                  {ACTIVITY_HEATMAP_LEVELS.map((level, i) => {
                    const week = Math.floor(i / 7) + 1
                    const day = (i % 7) + 1
                    const events = level * 3 + ((i * 7) % 4)
                    const bgClass = ACTIVITY_HEATMAP_COLORS[level]
                    return (
                      <div
                        key={i}
                        className={cn('h-3 w-3 rounded-sm', bgClass)}
                        title={`Week ${week}, Day ${day}: ${events} event${events === 1 ? '' : 's'}`}
                      />
                    )
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Quick actions for subcontractors - bid tracker */}
          {!isContractor && !loading && myBids.length > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b border-border p-5">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="font-bold">Bid tracker</h3>
                    <p className="text-xs text-muted-foreground">Your win rate and bid stats</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-amber-400/10 p-3 text-center">
                    <p className="text-2xl font-extrabold text-amber-600">{pendingBids}</p>
                    <p className="text-[10px] font-medium text-muted-foreground">Pending</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                    <p className="text-2xl font-extrabold text-emerald-600">{acceptedBids}</p>
                    <p className="text-[10px] font-medium text-muted-foreground">Accepted</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3 text-center">
                    <p className="text-2xl font-extrabold text-primary">{myBids.length > 0 ? Math.round((acceptedBids / myBids.length) * 100) : 0}%</p>
                    <p className="text-[10px] font-medium text-muted-foreground">Win rate</p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Profile card */}
          <Card className="overflow-hidden">
            <div className="hazard-stripe h-1.5 w-full" />
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <UserAvatar user={user} className="h-14 w-14 ring-2 ring-primary/20 ring-offset-2 ring-offset-card" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-bold">{user.name}</p>
                    {user.verified && <VerifiedBadge className="px-1.5 py-0" />}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{user.company || user.trade}</p>
                  <Badge variant="secondary" className="mt-1 gap-1 text-[10px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Online
                  </Badge>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <MiniStat value={user.rating ? user.rating.toFixed(1) : '—'} label="Rating" accent="text-amber-600" />
                <MiniStat value={user.reviewCount} label="Reviews" accent="text-primary" />
                <MiniStat value={user.jobsCompleted} label="Jobs" accent="text-emerald-600" />
              </div>
              {user.city && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {user.city}, {user.state}</p>
              )}
              <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => openProfile(user.id)}>
                <User className="mr-1.5 h-3.5 w-3.5" /> View profile
              </Button>
            </div>
          </Card>

          {/* Activity feed */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <div>
                  <h3 className="font-bold">Recent activity</h3>
                  <p className="text-xs text-muted-foreground">Your latest updates</p>
                </div>
              </div>
              <Badge variant="secondary" className="gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-live-dot" />
                Live
              </Badge>
            </div>
            <div className="max-h-80 overflow-y-auto scroll-thin">
              {notifs.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm font-medium">No activity yet</p>
                  <p className="text-xs text-muted-foreground">Bid and message updates will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {notifs.map((n, idx) => {
                    const map = NOTIF_ICON_MAP[n.type] || { icon: '🔔', tint: 'bg-muted' }
                    // Animate first 5 items with staggered slide-in-right (Task 9-b)
                    const shouldAnimate = idx < 5
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          'flex items-start gap-3 border-l-2 border-l-primary/30 p-3.5 transition-colors hover:border-l-primary hover:bg-accent/30',
                          !n.read && 'bg-primary/5',
                          shouldAnimate && 'animate-slide-in-right',
                        )}
                        style={shouldAnimate ? { animationDelay: `${idx * 40}ms` } : undefined}
                      >
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm ${map.tint}`}>
                          {map.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-semibold">{n.title}</p>
                            {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* Top subcontractors / quick actions */}
          {isContractor ? (
            <Card className="overflow-hidden">
              <div className="border-b border-border p-5">
                <h3 className="font-bold">Top subcontractors</h3>
                <p className="text-xs text-muted-foreground">Highly rated pros near you</p>
              </div>
              <div className="divide-y divide-border">
                {topSubs.map((sub, idx) => (
                  <button
                    key={sub.id}
                    onClick={() => openProfile(sub.id)}
                    className="group flex w-full animate-pop-in items-center gap-3 p-3 text-left transition-colors hover:bg-accent/50"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <UserAvatar user={sub} className="h-9 w-9 ring-2 ring-primary/20 transition-all group-hover:ring-primary/40" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold group-hover:text-primary transition-colors">{sub.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{sub.trade} · {sub.city}, {sub.state}</p>
                    </div>
                    <Rating value={sub.rating} count={sub.reviewCount} />
                  </button>
                ))}
                {topSubs.length === 0 && <p className="p-5 text-center text-sm text-muted-foreground">No subcontractors yet.</p>}
              </div>
              <div className="border-t border-border p-3">
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setView('directory')}>Browse all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="hazard-stripe h-1 w-full" />
              <div className="p-5">
                <h3 className="font-bold">Quick actions</h3>
                <div className="mt-3 space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => setView('directory')}><Briefcase className="mr-2 h-4 w-4" /> Browse open jobs</Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setView('messages')}><MessageSquare className="mr-2 h-4 w-4" /> Open messages</Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setView('billing')}><DollarSign className="mr-2 h-4 w-4" /> Upgrade to Pro</Button>
                </div>
                <div className="mt-4 rounded-lg bg-amber-400/10 p-3 ring-1 ring-amber-400/20">
                  <p className="text-xs font-semibold text-amber-600">💡 Pro tip</p>
                  <p className="mt-1 text-xs text-muted-foreground">Subcontractors with a profile photo and bio receive up to 3x more bids accepted.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ value, label, accent }: { value: React.ReactNode; label: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-muted/60 py-2">
      <p className={cn('text-sm font-bold', accent)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

function BidActivitySparkline({ data, width = 120, height = 32 }: { data: number[]; width?: number; height?: number }) {
  const n = data.length
  if (n === 0) {
    return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" />
  }
  const padding = 3
  const innerW = width - padding * 2
  const innerH = height - padding * 2
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min
  const stepX = n > 1 ? innerW / (n - 1) : 0
  const points = data.map((v, i) => {
    const x = padding + (n > 1 ? i * stepX : innerW / 2)
    const y = range === 0 ? padding + innerH / 2 : padding + innerH - ((v - min) / range) * innerH
    return { x, y }
  })
  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaD = `${lineD} L ${points[n - 1].x.toFixed(1)} ${(padding + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padding + innerH).toFixed(1)} Z`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="spark-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="spark-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#spark-area)" />
      <path
        d={lineD}
        fill="none"
        stroke="url(#spark-stroke)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-draw-line"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.8} fill="#fbbf24" />
      ))}
    </svg>
  )
}

/**
 * Activity heatmap (Task 9-b) — deterministic 35-cell intensity grid (5 weeks × 7 days).
 * Uses the seeded pseudo-random formula from the spec to pick a stable level per cell.
 */
const ACTIVITY_HEATMAP_LEVELS: number[] = Array.from({ length: 35 }, (_, i) => {
  // Spec: const level = Math.floor((Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) * 5) % 5
  const level = Math.floor((Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) * 5) % 5
  return level
})

const ACTIVITY_HEATMAP_COLORS: string[] = [
  'bg-muted',       // 0 — no activity
  'bg-primary/20',  // 1
  'bg-primary/40',  // 2
  'bg-primary/60',  // 3
  'bg-primary',     // 4 — most active
]

/**
 * Bid success rate donut chart (Task 9-b) — inline SVG donut with 3 segments
 * (Accepted / Pending / Rejected) and a centered acceptance-rate label.
 * No chart library dependency.
 */
function BidSuccessDonut({
  accepted,
  pending,
  rejected,
}: {
  accepted: number
  pending: number
  rejected: number
}) {
  const total = accepted + pending + rejected
  const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const size = 100

  const segments: ReadonlyArray<{ value: number; color: string; label: string }> = [
    { value: accepted, color: '#10b981', label: 'Accepted' }, // emerald-500
    { value: pending, color: '#fbbf24', label: 'Pending' },   // amber-400
    { value: rejected, color: '#f43f5e', label: 'Rejected' }, // rose-500
  ]

  let cumulative = 0
  const arcs = segments.map((seg) => {
    const fraction = total > 0 ? seg.value / total : 0
    const dashLength = fraction * circumference
    const offset = -cumulative
    cumulative += dashLength
    return (
      <circle
        key={seg.label}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={seg.color}
        strokeWidth={10}
        strokeDasharray={`${dashLength} ${circumference - dashLength}`}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        strokeLinecap="butt"
      />
    )
  })

  return (
    <div className="relative h-[100px] w-[100px] shrink-0" role="img" aria-label={`Bid acceptance rate ${acceptanceRate}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={10} className="text-muted" />
        {arcs}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold text-gradient-primary leading-none">{acceptanceRate}%</span>
        <span className="mt-0.5 text-[9px] text-muted-foreground">accepted</span>
      </div>
    </div>
  )
}
