'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { formatMoney, formatMoneyFull, timeAgo } from '@/components/crewup/shared/format'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  Award,
  Users,
  Activity,
  Briefcase,
  HardHat,
  Wrench,
  ArrowRight,
} from 'lucide-react'

// ---- API payload types ----------------------------------------------------

interface BidOverTimePoint {
  date: string
  count: number
}

interface ContractorPayload {
  role: 'CONTRACTOR'
  bidsOverTime: BidOverTimePoint[]
  jobsByStatus: { OPEN: number; ASSIGNED: number; COMPLETED: number; CANCELLED: number }
  jobsByTrade: { trade: string; count: number }[]
  pipelineValue: { open: number; assigned: number; completed: number }
  topSubcontractors: {
    id: string
    name: string
    trade: string
    rating: number
    bidCount: number
    acceptedCount: number
  }[]
  avgBidCount: number
  responseTime: string
}

interface SubcontractorPayload {
  role: 'SUBCONTRACTOR'
  bidsOverTime: BidOverTimePoint[]
  bidsByStatus: { PENDING: number; ACCEPTED: number; REJECTED: number }
  winRate: number
  avgBidAmount: number
  totalEarnings: number
  topTradesBid: { trade: string; count: number; winRate: number }[]
  recentResults: {
    id: string
    jobTitle: string
    amount: number
    status: string
    date: string
  }[]
}

type AnalyticsPayload = ContractorPayload | SubcontractorPayload

// ---- Palette --------------------------------------------------------------

// Fixed trade-color palette (amber/orange/emerald/rose + warm neutrals — no blue/indigo)
const TRADE_PALETTE: Record<string, string> = {
  Electrical: '#f59e0b',
  Plumbing: '#ea580c',
  Framing: '#d97706',
  Roofing: '#dc2626',
  Concrete: '#78716c',
  HVAC: '#10b981',
  Drywall: '#f97316',
  Painting: '#eab308',
  Flooring: '#b45309',
  Masonry: '#57534e',
  Excavation: '#92400e',
  Welding: '#ef4444',
  Carpentry: '#a16207',
  Landscaping: '#16a34a',
  Demolition: '#be123c',
  'General Labor': '#6b7280',
}

function colorForTrade(trade: string, fallbackIndex = 0): string {
  if (TRADE_PALETTE[trade]) return TRADE_PALETTE[trade]
  const fallback = ['#f59e0b', '#ea580c', '#10b981', '#dc2626', '#d97706', '#78716c']
  return fallback[fallbackIndex % fallback.length]
}

// ---- Chart: Line chart (SVG) ----------------------------------------------

function LineChart({
  data,
  height = 200,
  accent = '#f59e0b',
  emptyHint = 'No data yet',
}: {
  data: BidOverTimePoint[]
  height?: number
  accent?: string
  emptyHint?: string
}) {
  const W = 600
  const H = 200
  const PAD_X = 16
  const PAD_TOP = 16
  const PAD_BOTTOM = 28

  const counts = data.map((d) => d.count)
  const max = Math.max(1, ...counts)
  const total = counts.reduce((a, c) => a + c, 0)

  const innerW = W - PAD_X * 2
  const innerH = H - PAD_TOP - PAD_BOTTOM

  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0
  const points = data.map((d, i) => {
    const x = PAD_X + i * stepX
    const y = PAD_TOP + innerH - (d.count / max) * innerH
    return { x, y, ...d }
  })

  const polylineStr = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  // Build a closed polygon for the gradient fill (down to baseline)
  const baselineY = PAD_TOP + innerH
  const fillPolyStr = points.length
    ? `${points[0].x.toFixed(2)},${baselineY} ${polylineStr} ${points[points.length - 1].x.toFixed(2)},${baselineY}`
    : ''

  const gradId = useMemo(() => `lineGrad-${accent.replace('#', '')}`, [accent])

  if (total === 0) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground"
        style={{ height }}
      >
        {emptyHint}
      </div>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="Trend line chart"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={PAD_X}
          x2={W - PAD_X}
          y1={PAD_TOP + innerH * f}
          y2={PAD_TOP + innerH * f}
          stroke="currentColor"
          strokeOpacity={0.08}
          strokeWidth={1}
        />
      ))}

      {/* gradient fill under the line */}
      {fillPolyStr && <polygon points={fillPolyStr} fill={`url(#${gradId})`} />}

      {/* the trend line */}
      <polyline
        points={polylineStr}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* hover dots + tooltips (every 3rd day label) */}
      {points.map((p, i) => (
        <g key={i}>
          {(i % 3 === 0 || i === points.length - 1) && (
            <text
              x={p.x}
              y={H - 8}
              textAnchor="middle"
              fontSize="11"
              fill="currentColor"
              fillOpacity={0.55}
            >
              {p.date.slice(5)}
            </text>
          )}
          <circle cx={p.x} cy={p.y} r={3.5} fill={accent} stroke="white" strokeWidth={1.5}>
            <title>{`${p.date}: ${p.count} bid${p.count === 1 ? '' : 's'}`}</title>
          </circle>
        </g>
      ))}
    </svg>
  )
}

// ---- Chart: Donut / progress ring (SVG) -----------------------------------

function DonutRing({
  value,
  total,
  color,
  label,
  hint,
}: {
  value: number
  total: number
  color: string
  label: string
  hint: string
}) {
  const R = 36
  const C = 2 * Math.PI * R
  const pct = total > 0 ? value / total : 0
  const dash = `${(pct * C).toFixed(2)} ${C.toFixed(2)}`
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="96" height="96" viewBox="0 0 96 96" role="img" aria-label={`${label}: ${value}`}>
          <circle cx="48" cy="48" r={R} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={8} />
          <circle
            cx="48"
            cy="48"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={dash}
            strokeDashoffset={C * 0.25}
            transform="rotate(-90 48 48)"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold tabular-nums">{value}</span>
          <span className="text-[10px] text-muted-foreground">{total > 0 ? `${Math.round(pct * 100)}%` : '—'}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold">{label}</p>
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      </div>
    </div>
  )
}

// ---- Horizontal bar chart -------------------------------------------------

function HorizontalBars({
  items,
  max,
  formatValue,
  emptyHint,
}: {
  items: { label: string; value: number; meta?: string; color: string }[]
  max: number
  formatValue?: (n: number) => string
  emptyHint?: string
}) {
  const safeMax = max > 0 ? max : 1
  if (items.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
        {emptyHint || 'No data yet'}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={`${it.label}-${i}`}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium">{it.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatValue ? formatValue(it.value) : it.value}
              {it.meta ? ` · ${it.meta}` : ''}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(it.value / safeMax) * 100}%`, backgroundColor: it.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- KPI card -------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon: Icon,
  gradient,
  hint,
}: {
  label: string
  value: React.ReactNode
  icon: React.ElementType
  gradient: string
  hint?: string
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
          <Icon className="h-5 w-5 text-white" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground/70">{hint}</p>}
    </Card>
  )
}

// ---- Loading skeleton -----------------------------------------------------

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-lg bg-muted" />
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
            <div className="mt-4 h-6 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
          </Card>
        ))}
      </div>
      {/* Chart grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-48 w-full animate-pulse rounded-lg bg-muted" />
        </Card>
        <Card className="p-5">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-full animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="h-5 w-36 animate-pulse rounded bg-muted" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-full animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <div className="h-5 w-44 animate-pulse rounded bg-muted" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ---- Main view ------------------------------------------------------------

export function AnalyticsView() {
  const user = useApp((s) => s.user)!
  const setView = useApp((s) => s.setView)
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const payload = await api<AnalyticsPayload>('/api/stats/analytics')
        if (active) setData(payload)
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load analytics')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [user.id])

  const isContractor = user.role === 'CONTRACTOR'

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-amber-600 p-6 text-primary-foreground sm:p-8">
        <div className="absolute inset-0 bg-grid opacity-15" />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight">Analytics</h1>
                <p className="text-sm text-primary-foreground/90">
                  {isContractor ? 'Insights into your jobs, bids, and pipeline.' : 'Insights into your bids, win rate, and earnings.'}
                </p>
              </div>
            </div>
            <p className="mt-3 max-w-md text-sm text-primary-foreground/90">
              Data refreshed live from your last 14 days of activity.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium backdrop-blur">
            <Activity className="h-4 w-4" />
            <span>Last 14 days</span>
          </div>
        </div>
      </div>

      {loading && <AnalyticsSkeleton />}

      {!loading && error && (
        <Card className="p-8 text-center">
          <TrendingDown className="mx-auto h-10 w-10 text-rose-500/50" />
          <p className="mt-3 text-sm font-medium">Couldn&apos;t load your analytics</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button size="sm" className="mt-4" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </Card>
      )}

      {!loading && !error && data && isContractor && data.role === 'CONTRACTOR' && (
        <ContractorAnalytics
          payload={data}
          activeJobsCount={data.jobsByStatus.OPEN + data.jobsByStatus.ASSIGNED}
          onPostJob={() => setView('post-job')}
          onBrowseSubs={() => setView('directory')}
        />
      )}

      {!loading && !error && data && !isContractor && data.role === 'SUBCONTRACTOR' && (
        <SubcontractorAnalytics payload={data} activeBidsCount={data.bidsByStatus.PENDING} onFindWork={() => setView('directory')} />
      )}
    </div>
  )
}

// ---- Contractor analytics -------------------------------------------------

function ContractorAnalytics({
  payload,
  activeJobsCount,
  onPostJob,
  onBrowseSubs,
}: {
  payload: ContractorPayload
  activeJobsCount: number
  onPostJob: () => void
  onBrowseSubs: () => void
}) {
  const { bidsOverTime, jobsByStatus, jobsByTrade, pipelineValue, topSubcontractors, avgBidCount, responseTime } = payload

  const maxTrade = jobsByTrade.reduce((m, t) => Math.max(m, t.count), 0)
  const statusTiles = [
    { label: 'Open', value: jobsByStatus.OPEN, dot: 'bg-emerald-500', tint: 'bg-emerald-500/10 text-emerald-600' },
    { label: 'Assigned', value: jobsByStatus.ASSIGNED, dot: 'bg-amber-500', tint: 'bg-amber-500/10 text-amber-600' },
    { label: 'Completed', value: jobsByStatus.COMPLETED, dot: 'bg-primary', tint: 'bg-primary/10 text-primary' },
    { label: 'Cancelled', value: jobsByStatus.CANCELLED, dot: 'bg-rose-500', tint: 'bg-rose-500/10 text-rose-600' },
  ]

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Pipeline value (open)"
          value={formatMoney(pipelineValue.open)}
          icon={DollarSign}
          gradient="from-primary to-amber-500"
          hint={`Assigned ${formatMoney(pipelineValue.assigned)}`}
        />
        <KpiCard
          label="Avg bids / open job"
          value={avgBidCount.toFixed(1)}
          icon={Target}
          gradient="from-amber-500 to-orange-500"
          hint="across all open jobs"
        />
        <KpiCard
          label="Avg response time"
          value={responseTime}
          icon={Clock}
          gradient="from-emerald-500 to-emerald-600"
          hint="job post → first bid"
        />
        <KpiCard
          label="Active jobs"
          value={activeJobsCount}
          icon={Briefcase}
          gradient="from-orange-500 to-rose-500"
          hint="open + assigned"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bids over time */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-bold">Bids over time</h3>
                <p className="text-xs text-muted-foreground">Bids received on your jobs · last 14 days</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {bidsOverTime.reduce((a, p) => a + p.count, 0)} total
            </Badge>
          </div>
          <LineChart data={bidsOverTime} accent="#f59e0b" emptyHint="No bids received in the last 14 days" />
        </Card>

        {/* Jobs by status */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-amber-500" />
            <div>
              <h3 className="font-bold">Jobs by status</h3>
              <p className="text-xs text-muted-foreground">All your posted jobs</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {statusTiles.map((t) => (
              <div key={t.label} className={`rounded-xl ${t.tint} p-3`}>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                  <span className="text-xs font-medium">{t.label}</span>
                </div>
                <p className="mt-1 text-2xl font-extrabold tabular-nums">{t.value}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Jobs by trade */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <HardHat className="h-4 w-4 text-orange-500" />
            <div>
              <h3 className="font-bold">Jobs by trade</h3>
              <p className="text-xs text-muted-foreground">Top 6 trades you post</p>
            </div>
          </div>
          <HorizontalBars
            items={jobsByTrade.slice(0, 6).map((t, i) => ({
              label: t.trade,
              value: t.count,
              color: colorForTrade(t.trade, i),
            }))}
            max={maxTrade}
            emptyHint="No jobs posted yet"
          />
          <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={onPostJob}>
            <Briefcase className="mr-1.5 h-3.5 w-3.5" /> Post a new job
          </Button>
        </Card>

        {/* Top subcontractors */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-500" />
              <div>
                <h3 className="font-bold">Top subcontractors</h3>
                <p className="text-xs text-muted-foreground">Subs who bid on your jobs most often</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onBrowseSubs}>
              Browse all <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
          {topSubcontractors.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              No subcontractors have bid on your jobs yet
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {topSubcontractors.map((sub) => (
                <div key={sub.id} className="flex items-center gap-3 py-3">
                  <UserAvatar
                    user={{ name: sub.name, avatarUrl: null }}
                    className="h-9 w-9"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{sub.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{sub.trade}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-amber-500">★</span>
                    <span className="font-semibold tabular-nums">{sub.rating ? sub.rating.toFixed(1) : '—'}</span>
                  </div>
                  <div className="hidden text-right text-xs sm:block">
                    <p className="font-semibold tabular-nums">{sub.bidCount} bid{sub.bidCount === 1 ? '' : 's'}</p>
                    <p className="text-muted-foreground">{sub.acceptedCount} accepted</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-0 bg-emerald-500/10 text-emerald-600"
                  >
                    {sub.bidCount > 0 ? Math.round((sub.acceptedCount / sub.bidCount) * 100) : 0}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}

// ---- Subcontractor analytics ----------------------------------------------

function SubcontractorAnalytics({
  payload,
  activeBidsCount,
  onFindWork,
}: {
  payload: SubcontractorPayload
  activeBidsCount: number
  onFindWork: () => void
}) {
  const {
    bidsOverTime,
    bidsByStatus,
    winRate,
    avgBidAmount,
    totalEarnings,
    topTradesBid,
    recentResults,
  } = payload

  const totalBids = bidsByStatus.PENDING + bidsByStatus.ACCEPTED + bidsByStatus.REJECTED
  const maxTradeCount = topTradesBid.reduce((m, t) => Math.max(m, t.count), 0)

  const recentStatusMap: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-600' },
    ACCEPTED: { label: 'Accepted', cls: 'bg-emerald-500/15 text-emerald-600' },
    REJECTED: { label: 'Rejected', cls: 'bg-rose-500/15 text-rose-600' },
  }

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Win rate"
          value={`${winRate.toFixed(0)}%`}
          icon={Target}
          gradient="from-emerald-500 to-emerald-600"
          hint={`${bidsByStatus.ACCEPTED} of ${totalBids} bids`}
        />
        <KpiCard
          label="Avg bid amount"
          value={formatMoney(avgBidAmount)}
          icon={DollarSign}
          gradient="from-primary to-amber-500"
          hint="across all bids"
        />
        <KpiCard
          label="Total earnings"
          value={formatMoney(totalEarnings)}
          icon={Award}
          gradient="from-amber-500 to-orange-500"
          hint="accepted bid sum"
        />
        <KpiCard
          label="Active bids"
          value={activeBidsCount}
          icon={TrendingUp}
          gradient="from-orange-500 to-rose-500"
          hint="pending review"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bids over time */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-bold">Your bids over time</h3>
                <p className="text-xs text-muted-foreground">Bids you&apos;ve placed · last 14 days</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {bidsOverTime.reduce((a, p) => a + p.count, 0)} total
            </Badge>
          </div>
          <LineChart data={bidsOverTime} accent="#ea580c" emptyHint="No bids placed in the last 14 days" />
        </Card>

        {/* Bid results donut */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-500" />
            <div>
              <h3 className="font-bold">Bid results</h3>
              <p className="text-xs text-muted-foreground">All-time outcome breakdown</p>
            </div>
          </div>
          {totalBids === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              No bids yet
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <DonutRing
                value={bidsByStatus.PENDING}
                total={totalBids}
                color="#f59e0b"
                label="Pending"
                hint="awaiting"
              />
              <DonutRing
                value={bidsByStatus.ACCEPTED}
                total={totalBids}
                color="#10b981"
                label="Accepted"
                hint="won"
              />
              <DonutRing
                value={bidsByStatus.REJECTED}
                total={totalBids}
                color="#f43f5e"
                label="Rejected"
                hint="lost"
              />
            </div>
          )}
        </Card>

        {/* Top trades bid on (with win rate) */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-amber-500" />
            <div>
              <h3 className="font-bold">Top trades you bid on</h3>
              <p className="text-xs text-muted-foreground">Win rate per trade</p>
            </div>
          </div>
          <HorizontalBars
            items={topTradesBid.map((t, i) => ({
              label: t.trade,
              value: t.count,
              meta: `${Math.round(t.winRate)}% win`,
              color: colorForTrade(t.trade, i),
            }))}
            max={maxTradeCount}
            formatValue={(n) => `${n} bid${n === 1 ? '' : 's'}`}
            emptyHint="No bids placed yet"
          />
        </Card>

        {/* Recent results timeline */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              <div>
                <h3 className="font-bold">Recent results</h3>
                <p className="text-xs text-muted-foreground">Your last 8 bid outcomes</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onFindWork}>
              Find work <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
          {recentResults.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              No recent bids — start bidding to see results here
            </div>
          ) : (
            <ol className="relative space-y-1 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-border">
              {recentResults.map((r) => {
                const s = recentStatusMap[r.status] ?? { label: r.status, cls: 'bg-muted text-muted-foreground' }
                const isAccepted = r.status === 'ACCEPTED'
                const isRejected = r.status === 'REJECTED'
                const dotColor = isAccepted
                  ? 'bg-emerald-500'
                  : isRejected
                  ? 'bg-rose-500'
                  : 'bg-amber-500'
                return (
                  <li key={r.id} className="relative flex items-center gap-3 pl-6 py-2.5">
                    <span className={`absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full ring-4 ring-card ${dotColor}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.jobTitle}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(r.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">{formatMoneyFull(r.amount)}</p>
                      <Badge variant="outline" className={`mt-0.5 border-0 ${s.cls}`}>
                        {s.label}
                      </Badge>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </Card>
      </div>
    </>
  )
}
