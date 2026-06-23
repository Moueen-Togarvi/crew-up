import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { toPublicUser } from '@/lib/serialize'

// Unified search across jobs, subcontractors, and contractors.
// Used by the global Command Palette (Cmd+K / Ctrl+K).
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()

  // Empty or too-short queries return empty results — the palette will
  // still show the "Quick navigation" group in this case.
  if (!q || q.length < 2) {
    return NextResponse.json({ jobs: [], subcontractors: [], contractors: [] })
  }

  // --- Jobs ---
  let jobs: Array<{
    id: string
    title: string
    trade: string
    status: string
    budgetMin: number
    budgetMax: number
    city: string | null
    state: string | null
    contractorName: string
  }> = []
  try {
    const found = await db.job.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { trade: { contains: q } },
          { city: { contains: q } },
          { state: { contains: q } },
        ],
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { contractor: true, _count: { select: { bids: true } } },
    })
    jobs = found.map((j) => ({
      id: j.id,
      title: j.title,
      trade: j.trade,
      status: j.status,
      budgetMin: j.budgetMin,
      budgetMax: j.budgetMax,
      city: j.city,
      state: j.state,
      contractorName: j.contractor.name,
    }))
  } catch {
    jobs = []
  }

  // --- Subcontractors ---
  let subcontractors: Array<{
    id: string
    name: string
    trade: string | null | undefined
    company: string | null | undefined
    city: string | null | undefined
    state: string | null | undefined
    rating: number
    jobsCompleted: number
  }> = []
  try {
    const found = await db.user.findMany({
      where: {
        role: 'SUBCONTRACTOR',
        OR: [
          { name: { contains: q } },
          { trade: { contains: q } },
          { company: { contains: q } },
          { city: { contains: q } },
        ],
      },
      take: 8,
      orderBy: { rating: 'desc' },
    })
    subcontractors = found.map((u) => {
      const p = toPublicUser(u)
      return {
        id: p.id,
        name: p.name,
        trade: p.trade,
        company: p.company,
        city: p.city,
        state: p.state,
        rating: p.rating,
        jobsCompleted: p.jobsCompleted,
      }
    })
  } catch {
    subcontractors = []
  }

  // --- Contractors ---
  let contractors: Array<{
    id: string
    name: string
    company: string | null | undefined
    city: string | null | undefined
    state: string | null | undefined
    rating: number
  }> = []
  try {
    const found = await db.user.findMany({
      where: {
        role: 'CONTRACTOR',
        OR: [
          { name: { contains: q } },
          { company: { contains: q } },
          { city: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { rating: 'desc' },
    })
    contractors = found.map((u) => {
      const p = toPublicUser(u)
      return {
        id: p.id,
        name: p.name,
        company: p.company,
        city: p.city,
        state: p.state,
        rating: p.rating,
      }
    })
  } catch {
    contractors = []
  }

  return NextResponse.json({ jobs, subcontractors, contractors })
}
