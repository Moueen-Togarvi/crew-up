import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

interface PortfolioItem {
  id: string
  title: string
  trade: string
  category: string
  budgetMin: number
  budgetMax: number
  city: string | null
  state: string | null
  completedAt: string | null
  imageUrl: string | null
  partnerName: string
  partnerCompany: string | null
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await ctx.params

    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const portfolio: PortfolioItem[] = []

    if (user.role === 'SUBCONTRACTOR') {
      // Subcontractor: jobs they had an ACCEPTED bid on.
      const bids = await db.bid.findMany({
        where: { subcontractorId: id, status: 'ACCEPTED' },
        include: { job: { include: { contractor: true } } },
        orderBy: { job: { updatedAt: 'desc' } },
      })

      const completed = bids
        .filter((b) => b.job && b.job.status === 'COMPLETED')
        .map((b) => ({
          id: b.job.id,
          title: b.job.title,
          trade: b.job.trade,
          category: b.job.category,
          budgetMin: b.job.budgetMin,
          budgetMax: b.job.budgetMax,
          city: b.job.city,
          state: b.job.state,
          completedAt: b.job.updatedAt.toISOString(),
          imageUrl: null,
          partnerName: b.job.contractor.name,
          partnerCompany: b.job.contractor.company,
        }))

      portfolio.push(...completed)

      // Backfill with ASSIGNED jobs if fewer than 3 completed items.
      if (completed.length < 3) {
        const assigned = bids
          .filter((b) => b.job && b.job.status === 'ASSIGNED')
          .map((b) => ({
            id: b.job.id,
            title: b.job.title,
            trade: b.job.trade,
            category: b.job.category,
            budgetMin: b.job.budgetMin,
            budgetMax: b.job.budgetMax,
            city: b.job.city,
            state: b.job.state,
            completedAt: null,
            imageUrl: null,
            partnerName: b.job.contractor.name,
            partnerCompany: b.job.contractor.company,
          }))
        for (const item of assigned) {
          if (portfolio.length >= 3) break
          if (!portfolio.some((p) => p.id === item.id)) {
            portfolio.push(item)
          }
        }
      }
    } else if (user.role === 'CONTRACTOR') {
      // Contractor: jobs they posted that are COMPLETED (with assigned sub via accepted bid).
      const completedJobs = await db.job.findMany({
        where: { contractorId: id, status: 'COMPLETED' },
        include: { bids: { where: { status: 'ACCEPTED' }, include: { subcontractor: true }, take: 1 } },
        orderBy: { updatedAt: 'desc' },
      })

      for (const job of completedJobs) {
        const acceptedBid = job.bids[0]
        portfolio.push({
          id: job.id,
          title: job.title,
          trade: job.trade,
          category: job.category,
          budgetMin: job.budgetMin,
          budgetMax: job.budgetMax,
          city: job.city,
          state: job.state,
          completedAt: job.updatedAt.toISOString(),
          imageUrl: null,
          partnerName: acceptedBid?.subcontractor.name || 'Subcontractor',
          partnerCompany: acceptedBid?.subcontractor.company ?? null,
        })
      }

      // Backfill with ASSIGNED jobs if fewer than 3 completed items.
      if (portfolio.length < 3) {
        const assignedJobs = await db.job.findMany({
          where: { contractorId: id, status: 'ASSIGNED' },
          include: { bids: { where: { status: 'ACCEPTED' }, include: { subcontractor: true }, take: 1 } },
          orderBy: { updatedAt: 'desc' },
        })
        for (const job of assignedJobs) {
          if (portfolio.length >= 3) break
          const acceptedBid = job.bids[0]
          portfolio.push({
            id: job.id,
            title: job.title,
            trade: job.trade,
            category: job.category,
            budgetMin: job.budgetMin,
            budgetMax: job.budgetMax,
            city: job.city,
            state: job.state,
            completedAt: null,
            imageUrl: null,
            partnerName: acceptedBid?.subcontractor.name || 'Subcontractor',
            partnerCompany: acceptedBid?.subcontractor.company ?? null,
          })
        }
      }
    }

    return NextResponse.json({ portfolio })
  } catch {
    return NextResponse.json({ portfolio: [] })
  }
}
