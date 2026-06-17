import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// ---- Shared types ---------------------------------------------------------

interface BidOverTimePoint {
  date: string
  count: number
}

interface JobsByStatus {
  OPEN: number
  ASSIGNED: number
  COMPLETED: number
  CANCELLED: number
}

interface JobsByTradePoint {
  trade: string
  count: number
}

interface PipelineValue {
  open: number
  assigned: number
  completed: number
}

interface TopSubcontractor {
  id: string
  name: string
  trade: string
  rating: number
  bidCount: number
  acceptedCount: number
}

interface ContractorAnalytics {
  role: 'CONTRACTOR'
  bidsOverTime: BidOverTimePoint[]
  jobsByStatus: JobsByStatus
  jobsByTrade: JobsByTradePoint[]
  pipelineValue: PipelineValue
  topSubcontractors: TopSubcontractor[]
  avgBidCount: number
  responseTime: string
}

interface BidsByStatus {
  PENDING: number
  ACCEPTED: number
  REJECTED: number
}

interface TopTradeBid {
  trade: string
  count: number
  winRate: number
}

interface RecentResult {
  id: string
  jobTitle: string
  amount: number
  status: string
  date: string
}

interface SubcontractorAnalytics {
  role: 'SUBCONTRACTOR'
  bidsOverTime: BidOverTimePoint[]
  bidsByStatus: BidsByStatus
  winRate: number
  avgBidAmount: number
  totalEarnings: number
  topTradesBid: TopTradeBid[]
  recentResults: RecentResult[]
}

// ---- Helpers --------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000

function toDateString(d: Date): string {
  // YYYY-MM-DD in local time
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function build14DayBuckets(): { date: string; start: Date; end: Date }[] {
  const buckets: { date: string; start: Date; end: Date }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 13; i >= 0; i--) {
    const start = new Date(today.getTime() - i * DAY_MS)
    const end = new Date(start.getTime() + DAY_MS)
    buckets.push({ date: toDateString(start), start, end })
  }
  return buckets
}

function formatResponseTime(ms: number): string {
  if (!ms || ms <= 0) return '—'
  const hours = ms / (1000 * 60 * 60)
  if (hours < 1) {
    const minutes = Math.round(ms / (1000 * 60))
    return `${minutes}m`
  }
  if (hours < 48) return `${hours.toFixed(1)}h`
  const days = hours / 24
  return `${days.toFixed(1)}d`
}

// ---- Route ----------------------------------------------------------------

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role === 'CONTRACTOR') {
    return NextResponse.json(await buildContractorAnalytics(session.userId))
  }
  if (session.role === 'SUBCONTRACTOR') {
    return NextResponse.json(await buildSubcontractorAnalytics(session.userId))
  }
  return NextResponse.json({ error: 'Unknown role' }, { status: 400 })
}

// ---- Contractor -----------------------------------------------------------

async function buildContractorAnalytics(userId: string): Promise<ContractorAnalytics> {
  // Bids over time (last 14 days) — bids received on their jobs
  let bidsOverTime: BidOverTimePoint[] = []
  try {
    const buckets = build14DayBuckets()
    const start = buckets[0].start
    const end = buckets[buckets.length - 1].end
    const bids = await db.bid.findMany({
      where: {
        job: { contractorId: userId },
        createdAt: { gte: start, lt: end },
      },
      select: { createdAt: true },
    })
    bidsOverTime = buckets.map((b) => ({
      date: b.date,
      count: bids.filter((bid) => {
        const t = bid.createdAt.getTime()
        return t >= b.start.getTime() && t < b.end.getTime()
      }).length,
    }))
  } catch {
    bidsOverTime = []
  }

  // Jobs by status
  let jobsByStatus: JobsByStatus = { OPEN: 0, ASSIGNED: 0, COMPLETED: 0, CANCELLED: 0 }
  try {
    const grouped = await db.job.groupBy({
      by: ['status'],
      where: { contractorId: userId },
      _count: { _all: true },
    })
    const map: Record<string, number> = {}
    for (const g of grouped) map[g.status] = g._count._all
    jobsByStatus = {
      OPEN: map['OPEN'] ?? 0,
      ASSIGNED: map['ASSIGNED'] ?? 0,
      COMPLETED: map['COMPLETED'] ?? 0,
      CANCELLED: map['CANCELLED'] ?? 0,
    }
  } catch {
    /* keep defaults */
  }

  // Jobs by trade
  let jobsByTrade: JobsByTradePoint[] = []
  try {
    const grouped = await db.job.groupBy({
      by: ['trade'],
      where: { contractorId: userId },
      _count: { _all: true },
      orderBy: { _count: { trade: 'desc' } },
    })
    jobsByTrade = grouped.map((g) => ({ trade: g.trade, count: g._count._all }))
  } catch {
    jobsByTrade = []
  }

  // Pipeline value (sum of budgetMax by status)
  let pipelineValue: PipelineValue = { open: 0, assigned: 0, completed: 0 }
  try {
    const jobs = await db.job.findMany({
      where: { contractorId: userId },
      select: { status: true, budgetMax: true },
    })
    let open = 0
    let assigned = 0
    let completed = 0
    for (const j of jobs) {
      if (j.status === 'OPEN') open += j.budgetMax
      else if (j.status === 'ASSIGNED') assigned += j.budgetMax
      else if (j.status === 'COMPLETED') completed += j.budgetMax
    }
    pipelineValue = { open, assigned, completed }
  } catch {
    /* keep defaults */
  }

  // Top subcontractors (subs who bid on their jobs)
  let topSubcontractors: TopSubcontractor[] = []
  try {
    const bids = await db.bid.findMany({
      where: { job: { contractorId: userId } },
      select: {
        id: true,
        status: true,
        subcontractorId: true,
        subcontractor: {
          select: {
            id: true,
            name: true,
            trade: true,
            rating: true,
          },
        },
      },
    })
    const bySub = new Map<string, TopSubcontractor>()
    for (const b of bids) {
      const sub = b.subcontractor
      if (!sub) continue
      const existing = bySub.get(sub.id)
      if (existing) {
        existing.bidCount += 1
        if (b.status === 'ACCEPTED') existing.acceptedCount += 1
      } else {
        bySub.set(sub.id, {
          id: sub.id,
          name: sub.name,
          trade: sub.trade ?? '—',
          rating: sub.rating ?? 0,
          bidCount: 1,
          acceptedCount: b.status === 'ACCEPTED' ? 1 : 0,
        })
      }
    }
    topSubcontractors = Array.from(bySub.values())
      .sort((a, b) => b.bidCount - a.bidCount || b.acceptedCount - a.acceptedCount)
      .slice(0, 5)
  } catch {
    topSubcontractors = []
  }

  // Avg bids per open job
  let avgBidCount = 0
  try {
    const openJobs = await db.job.findMany({
      where: { contractorId: userId, status: 'OPEN' },
      select: { id: true },
    })
    if (openJobs.length > 0) {
      const counts = await db.bid.groupBy({
        by: ['jobId'],
        where: { jobId: { in: openJobs.map((j) => j.id) } },
        _count: { _all: true },
      })
      const total = counts.reduce((a, c) => a + c._count._all, 0)
      avgBidCount = total / openJobs.length
    }
  } catch {
    avgBidCount = 0
  }

  // Response time: avg time from job post to first bid
  let responseTime = '—'
  try {
    const jobs = await db.job.findMany({
      where: { contractorId: userId },
      select: {
        id: true,
        createdAt: true,
        bids: { select: { createdAt: true }, orderBy: { createdAt: 'asc' }, take: 1 },
      },
      take: 100,
    })
    const deltas: number[] = []
    for (const j of jobs) {
      if (j.bids.length > 0) {
        const delta = j.bids[0].createdAt.getTime() - j.createdAt.getTime()
        if (delta > 0) deltas.push(delta)
      }
    }
    if (deltas.length > 0) {
      const avg = deltas.reduce((a, d) => a + d, 0) / deltas.length
      responseTime = formatResponseTime(avg)
    }
  } catch {
    responseTime = '—'
  }

  return {
    role: 'CONTRACTOR',
    bidsOverTime,
    jobsByStatus,
    jobsByTrade,
    pipelineValue,
    topSubcontractors,
    avgBidCount,
    responseTime,
  }
}

// ---- Subcontractor --------------------------------------------------------

async function buildSubcontractorAnalytics(userId: string): Promise<SubcontractorAnalytics> {
  // Bids over time (their bids placed, last 14 days)
  let bidsOverTime: BidOverTimePoint[] = []
  try {
    const buckets = build14DayBuckets()
    const start = buckets[0].start
    const end = buckets[buckets.length - 1].end
    const bids = await db.bid.findMany({
      where: {
        subcontractorId: userId,
        createdAt: { gte: start, lt: end },
      },
      select: { createdAt: true },
    })
    bidsOverTime = buckets.map((b) => ({
      date: b.date,
      count: bids.filter((bid) => {
        const t = bid.createdAt.getTime()
        return t >= b.start.getTime() && t < b.end.getTime()
      }).length,
    }))
  } catch {
    bidsOverTime = []
  }

  // Bids by status + win rate + avg amount + total earnings
  let bidsByStatus: BidsByStatus = { PENDING: 0, ACCEPTED: 0, REJECTED: 0 }
  let winRate = 0
  let avgBidAmount = 0
  let totalEarnings = 0
  try {
    const grouped = await db.bid.groupBy({
      by: ['status'],
      where: { subcontractorId: userId },
      _count: { _all: true },
      _avg: { amount: true },
      _sum: { amount: true },
    })
    const map: Record<string, { count: number; avg: number | null; sum: number | null }> = {}
    for (const g of grouped) {
      map[g.status] = {
        count: g._count._all,
        avg: g._avg.amount,
        sum: g._sum.amount,
      }
    }
    const pending = map['PENDING']?.count ?? 0
    const accepted = map['ACCEPTED']?.count ?? 0
    const rejected = map['REJECTED']?.count ?? 0
    bidsByStatus = { PENDING: pending, ACCEPTED: accepted, REJECTED: rejected }
    const total = pending + accepted + rejected
    winRate = total > 0 ? (accepted / total) * 100 : 0
    avgBidAmount = map['PENDING']?.avg ?? map['ACCEPTED']?.avg ?? map['REJECTED']?.avg ?? 0
    totalEarnings = map['ACCEPTED']?.sum ?? 0
  } catch {
    /* keep defaults */
  }

  // Top trades bid on (with win rate)
  let topTradesBid: TopTradeBid[] = []
  try {
    const bids = await db.bid.findMany({
      where: { subcontractorId: userId },
      select: {
        status: true,
        job: { select: { trade: true } },
      },
    })
    const byTrade = new Map<string, { count: number; accepted: number }>()
    for (const b of bids) {
      const trade = b.job?.trade ?? 'Unknown'
      const entry = byTrade.get(trade) ?? { count: 0, accepted: 0 }
      entry.count += 1
      if (b.status === 'ACCEPTED') entry.accepted += 1
      byTrade.set(trade, entry)
    }
    topTradesBid = Array.from(byTrade.entries())
      .map(([trade, v]) => ({
        trade,
        count: v.count,
        winRate: v.count > 0 ? (v.accepted / v.count) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  } catch {
    topTradesBid = []
  }

  // Recent results (last 8)
  let recentResults: RecentResult[] = []
  try {
    const bids = await db.bid.findMany({
      where: { subcontractorId: userId },
      include: { job: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })
    recentResults = bids.map((b) => ({
      id: b.id,
      jobTitle: b.job?.title ?? 'Untitled job',
      amount: b.amount,
      status: b.status,
      date: b.createdAt.toISOString(),
    }))
  } catch {
    recentResults = []
  }

  return {
    role: 'SUBCONTRACTOR',
    bidsOverTime,
    bidsByStatus,
    winRate,
    avgBidAmount,
    totalEarnings,
    topTradesBid,
    recentResults,
  }
}
