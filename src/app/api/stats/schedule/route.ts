import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// ---- Types ----------------------------------------------------------------

interface ScheduleEvent {
  id: string
  title: string
  trade: string
  status: string // OPEN | ASSIGNED | COMPLETED
  startDate: string // ISO date
  endDate: string // ISO date
  budgetMin: number
  budgetMax: number
  location: string
  partnerName: string // contractor name (for subs) or assigned sub name (for contractors)
  partnerCompany: string | null
  crewSize: number
}

interface ScheduleResponse {
  events: ScheduleEvent[]
}

// ---- Helpers --------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Parse a duration string like "3-4 weeks", "2 weeks", "1 week",
 * "10 days", "1 month", "2 months" into a number of days.
 * Takes the FIRST number for ranges (e.g. "3-4 weeks" → 3 weeks).
 * Defaults to 14 days when parsing fails.
 */
function parseDurationDays(duration: string | null | undefined): number {
  if (!duration) return 14
  const s = duration.toLowerCase().trim()
  const match = s.match(/(\d+)/)
  if (!match) return 14
  const n = parseInt(match[1], 10)
  if (!Number.isFinite(n) || n <= 0) return 14
  if (s.includes('day')) return n
  if (s.includes('week')) return n * 7
  if (s.includes('month')) return n * 30
  if (s.includes('year')) return n * 365
  // Default unit = weeks
  return n * 7
}

interface JobDateFields {
  status: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Derive a start date for a job based on its status:
 * - ASSIGNED → updatedAt (when it was assigned)
 * - OPEN → createdAt + 14 days (estimated start while still bidding)
 * - otherwise (e.g. COMPLETED for subs) → createdAt fallback
 */
function computeStartDate(job: JobDateFields): Date {
  if (job.status === 'ASSIGNED') return new Date(job.updatedAt)
  if (job.status === 'OPEN') return new Date(job.createdAt.getTime() + 14 * DAY_MS)
  return new Date(job.createdAt)
}

// ---- Route ----------------------------------------------------------------

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const events: ScheduleEvent[] = []

    if (session.role === 'CONTRACTOR') {
      const jobs = await db.job.findMany({
        where: {
          contractorId: session.userId,
          status: { in: ['OPEN', 'ASSIGNED'] },
        },
        include: {
          bids: {
            where: { status: 'ACCEPTED' },
            include: {
              subcontractor: {
                select: { name: true, company: true },
              },
            },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      for (const job of jobs) {
        const startDate = computeStartDate(job)
        const durationDays = parseDurationDays(job.duration)
        const endDate = new Date(startDate.getTime() + durationDays * DAY_MS)
        const acceptedBid = job.bids.find((b) => b.status === 'ACCEPTED')
        const partner = acceptedBid?.subcontractor
        events.push({
          id: job.id,
          title: job.title,
          trade: job.trade,
          status: job.status,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          budgetMin: job.budgetMin,
          budgetMax: job.budgetMax,
          location: job.location,
          partnerName: partner?.name ?? 'Unassigned',
          partnerCompany: partner?.company ?? null,
          crewSize: job.crewSize,
        })
      }
    } else if (session.role === 'SUBCONTRACTOR') {
      const bids = await db.bid.findMany({
        where: {
          subcontractorId: session.userId,
          status: 'ACCEPTED',
          job: { status: { in: ['OPEN', 'ASSIGNED', 'COMPLETED'] } },
        },
        include: {
          job: {
            include: {
              contractor: {
                select: { name: true, company: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      for (const bid of bids) {
        const job = bid.job
        if (!job) continue
        const startDate = computeStartDate(job)
        const durationDays = parseDurationDays(job.duration)
        const endDate = new Date(startDate.getTime() + durationDays * DAY_MS)
        const contractor = job.contractor
        events.push({
          id: job.id,
          title: job.title,
          trade: job.trade,
          status: job.status,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          budgetMin: job.budgetMin,
          budgetMax: job.budgetMax,
          location: job.location,
          partnerName: contractor?.name ?? 'Unknown',
          partnerCompany: contractor?.company ?? null,
          crewSize: job.crewSize,
        })
      }
    }

    const body: ScheduleResponse = { events }
    return NextResponse.json(body)
  } catch {
    // Be defensive — never break the UI
    const fallback: ScheduleResponse = { events: [] }
    return NextResponse.json(fallback)
  }
}
