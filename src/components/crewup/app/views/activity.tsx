'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { formatMoney, timeAgo } from '@/components/crewup/shared/format'
import { cn } from '@/lib/utils'
import {
  Activity as ActivityIcon,
  Briefcase,
  Gavel,
  CheckCircle2,
  Star,
  UserPlus,
  HardHat,
  Wrench,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

type ActivityType =
  | 'JOB_POSTED'
  | 'BID_PLACED'
  | 'JOB_COMPLETED'
  | 'REVIEW_LEFT'
  | 'USER_JOINED'

interface ActivityItem {
  id: string
  type: ActivityType
  actorId: string
  actorName: string
  actorRole: 'CONTRACTOR' | 'SUBCONTRACTOR'
  actorAvatarUrl: string | null
  targetId: string | null
  targetName: string | null
  targetTrade: string | null
  amount: number | null
  rating: number | null
  createdAt: string
}

type FilterKey = 'ALL' | 'JOB' | 'BID' | 'COMPLETION' | 'REVIEW' | 'MEMBER'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'JOB', label: 'Jobs' },
  { key: 'BID', label: 'Bids' },
  { key: 'COMPLETION', label: 'Completions' },
  { key: 'REVIEW', label: 'Reviews' },
  { key: 'MEMBER', label: 'Members' },
]

const FILTER_TYPE_MAP: Record<FilterKey, ActivityType[]> = {
  ALL: ['JOB_POSTED', 'BID_PLACED', 'JOB_COMPLETED', 'REVIEW_LEFT', 'USER_JOINED'],
  JOB: ['JOB_POSTED'],
  BID: ['BID_PLACED'],
  COMPLETION: ['JOB_COMPLETED'],
  REVIEW: ['REVIEW_LEFT'],
  MEMBER: ['USER_JOINED'],
}

const TYPE_META: Record<
  ActivityType,
  {
    icon: LucideIcon
    nodeClass: string
    iconClass: string
    accent: string
  }
> = {
  JOB_POSTED: {
    icon: Briefcase,
    nodeClass: 'bg-amber-500 text-white ring-amber-500/20',
    iconClass: 'h-4 w-4',
    accent: 'bg-amber-500',
  },
  BID_PLACED: {
    icon: Gavel,
    nodeClass: 'bg-emerald-600 text-white ring-emerald-600/20',
    iconClass: 'h-4 w-4',
    accent: 'bg-emerald-600',
  },
  JOB_COMPLETED: {
    icon: CheckCircle2,
    nodeClass: 'bg-primary text-primary-foreground ring-primary/20',
    iconClass: 'h-4 w-4',
    accent: 'bg-primary',
  },
  REVIEW_LEFT: {
    icon: Star,
    nodeClass: 'bg-rose-500 text-white ring-rose-500/20',
    iconClass: 'h-4 w-4',
    accent: 'bg-rose-500',
  },
  USER_JOINED: {
    icon: UserPlus,
    nodeClass: 'bg-orange-500 text-white ring-orange-500/20',
    iconClass: 'h-4 w-4',
    accent: 'bg-orange-500',
  },
}

function actionText(a: ActivityItem): string {
  switch (a.type) {
    case 'JOB_POSTED':
      return 'posted a new job'
    case 'BID_PLACED':
      return `placed a ${formatMoney(a.amount ?? 0)} bid on`
    case 'JOB_COMPLETED':
      return 'marked complete'
    case 'REVIEW_LEFT':
      return `left a ${a.rating ?? 5}★ review for`
    case 'USER_JOINED':
      return 'joined BuildUp'
  }
}

interface TargetKind {
  kind: 'job' | 'user' | null
  targetId: string | null
  targetName: string | null
}

function targetFor(a: ActivityItem): TargetKind {
  if (a.type === 'USER_JOINED') return { kind: null, targetId: null, targetName: null }
  if (a.type === 'REVIEW_LEFT') return { kind: 'user', targetId: a.targetId, targetName: a.targetName }
  return { kind: 'job', targetId: a.targetId, targetName: a.targetName }
}

function RoleBadge({ role }: { role: 'CONTRACTOR' | 'SUBCONTRACTOR' }) {
  if (role === 'CONTRACTOR') {
    return (
      <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
        <HardHat className="h-3 w-3" /> Contractor
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1 bg-amber-400/15 text-amber-700 dark:text-amber-400">
      <Wrench className="h-3 w-3" /> Subcontractor
    </Badge>
  )
}

function ActivityRow({
  a,
  index,
  isLast,
}: {
  a: ActivityItem
  index: number
  isLast: boolean
}) {
  const openJob = useApp((s) => s.openJob)
  const openProfile = useApp((s) => s.openProfile)
  const meta = TYPE_META[a.type]
  const Icon = meta.icon
  const tgt = targetFor(a)

  const handleTargetClick = () => {
    if (!tgt.targetId) return
    if (tgt.kind === 'job') openJob(tgt.targetId)
    else if (tgt.kind === 'user') openProfile(tgt.targetId)
  }

  return (
    <li className="relative pl-12">
      {/* Rail segment */}
      {!isLast && (
        <span
          aria-hidden
          className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gradient-to-b from-border via-border to-transparent"
        />
      )}

      {/* Icon node on the rail */}
      <span
        className={cn(
          'absolute left-2 top-1.5 grid h-9 w-9 place-items-center rounded-full shadow-sm ring-4 ring-background',
          meta.nodeClass
        )}
      >
        <Icon className={meta.iconClass} />
      </span>

      {/* Card */}
      <div
        className={cn(
          'group relative mb-3 overflow-hidden rounded-xl border border-border bg-card p-4 transition-colors',
          'hover:border-primary/30 hover:bg-accent/40'
        )}
      >
        {/* Left-edge accent on hover */}
        <span
          aria-hidden
          className={cn(
            'absolute left-0 top-0 h-full w-1 opacity-0 transition-opacity group-hover:opacity-100',
            meta.accent
          )}
        />

        <div className="flex items-start gap-3">
          <UserAvatar
            user={{ name: a.actorName, avatarUrl: a.actorAvatarUrl }}
            className="h-9 w-9"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <button
                onClick={() => openProfile(a.actorId)}
                className="truncate text-sm font-semibold hover:text-primary hover:underline"
              >
                {a.actorName}
              </button>
              <RoleBadge role={a.actorRole} />
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              <span className="text-foreground/80">{actionText(a)}</span>
              {tgt.targetName && tgt.targetId && (
                <>
                  {' '}
                  <button
                    onClick={handleTargetClick}
                    className="font-semibold text-primary hover:underline"
                  >
                    {tgt.targetName}
                  </button>
                </>
              )}
              {a.targetTrade && a.type !== 'USER_JOINED' && (
                <>
                  {' '}
                  <span className="text-xs text-muted-foreground/80">· {a.targetTrade}</span>
                </>
              )}
            </p>

            <p className="mt-1.5 text-xs text-muted-foreground/70">
              {timeAgo(a.createdAt)}
            </p>
          </div>

          {/* Type pill on the right for at-a-glance scanning */}
          <span
            className={cn(
              'hidden shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold sm:inline-flex',
              a.type === 'JOB_POSTED' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
              a.type === 'BID_PLACED' && 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
              a.type === 'JOB_COMPLETED' && 'bg-primary/10 text-primary',
              a.type === 'REVIEW_LEFT' && 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
              a.type === 'USER_JOINED' && 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
            )}
          >
            <Icon className="h-3 w-3" />
            {a.type === 'JOB_POSTED' && 'Job'}
            {a.type === 'BID_PLACED' && 'Bid'}
            {a.type === 'JOB_COMPLETED' && 'Done'}
            {a.type === 'REVIEW_LEFT' && 'Review'}
            {a.type === 'USER_JOINED' && 'Member'}
          </span>
        </div>
      </div>

      {/* Tiny inline index marker for screen readers (subtle a11y aid) */}
      <span className="sr-only">Activity {index + 1}</span>
    </li>
  )
}

function ActivitySkeletonRow() {
  return (
    <li className="relative pl-12">
      <span
        aria-hidden
        className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border"
      />
      <span className="absolute left-2 top-1.5 grid h-9 w-9 place-items-center rounded-full bg-accent">
        <Skeleton className="h-5 w-5 rounded-full" />
      </span>
      <div className="mb-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </li>
  )
}

export function ActivityView() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('ALL')

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const { activities } = await api<{ activities: ActivityItem[] }>(
          '/api/stats/activity'
        )
        if (active) setItems(activities)
      } catch {
        if (active) setItems([])
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const visible = useMemo(() => {
    const allowed = FILTER_TYPE_MAP[filter]
    if (filter === 'ALL') return items
    return items.filter((a) => allowed.includes(a.type))
  }, [items, filter])

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      ALL: items.length,
      JOB: 0,
      BID: 0,
      COMPLETION: 0,
      REVIEW: 0,
      MEMBER: 0,
    }
    for (const a of items) {
      if (a.type === 'JOB_POSTED') c.JOB++
      else if (a.type === 'BID_PLACED') c.BID++
      else if (a.type === 'JOB_COMPLETED') c.COMPLETION++
      else if (a.type === 'REVIEW_LEFT') c.REVIEW++
      else if (a.type === 'USER_JOINED') c.MEMBER++
    }
    return c
  }, [items])

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="overflow-hidden p-0">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary to-amber-600 p-6 text-primary-foreground sm:p-8">
          <div className="absolute inset-0 bg-grid opacity-15" />
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
                  <ActivityIcon className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight">
                    Activity feed
                  </h1>
                  <p className="text-sm text-primary-foreground/90">
                    See what&apos;s happening across BuildUp right now
                  </p>
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-white animate-live-dot" />
              Live
            </span>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 border-t border-border p-4">
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <Button
                key={f.key}
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'gap-1.5',
                  !active && 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label}
                <Badge
                  variant={active ? 'secondary' : 'outline'}
                  className={cn(
                    'h-5 px-1.5 text-[10px]',
                    active && 'bg-white/20 text-primary-foreground'
                  )}
                >
                  {counts[f.key]}
                </Badge>
              </Button>
            )
          })}
        </div>
      </Card>

      {/* Timeline */}
      <Card className="p-5 sm:p-6">
        {loading ? (
          <ul className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <ActivitySkeletonRow key={i} />
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
              <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-amber-400/20">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
              </span>
            </span>
            <h3 className="mt-4 text-lg font-bold">No activity yet</h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              {filter === 'ALL'
                ? 'When jobs are posted, bids are placed, and members join, you\'ll see it all here.'
                : 'No events of this type yet. Try a different filter or check back soon.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-0">
            {visible.map((a, i) => (
              <ActivityRow
                key={a.id}
                a={a}
                index={i}
                isLast={i === visible.length - 1}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
