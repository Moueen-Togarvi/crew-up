import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { toPublicUser } from '@/lib/serialize'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const trade = searchParams.get('trade')
  const category = searchParams.get('category')
  const urgency = searchParams.get('urgency')
  const status = searchParams.get('status') || 'OPEN'
  const q = searchParams.get('q')
  const state = searchParams.get('state')
  const sort = searchParams.get('sort') || 'newest'

  const where: Record<string, unknown> = {}
  if (status && status !== 'ALL') where.status = status
  if (trade && trade !== 'ALL') where.trade = trade
  if (category && category !== 'ALL') where.category = category
  if (urgency && urgency !== 'ALL') where.urgency = urgency
  if (state && state !== 'ALL') where.state = state
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { location: { contains: q } },
    ]
  }

  const orderBy =
    sort === 'budget'
      ? { budgetMax: 'desc' as const }
      : sort === 'urgency'
      ? { urgency: 'asc' as const }
      : { createdAt: 'desc' as const }

  const jobs = await db.job.findMany({
    where,
    orderBy,
    include: {
      contractor: true,
      bids: { include: { subcontractor: true }, orderBy: { createdAt: 'desc' } },
    },
    take: 100,
  })

  const result = jobs.map((j) => ({
    ...j,
    contractor: toPublicUser(j.contractor),
    bids: j.bids.map((b) => ({ ...b, subcontractor: toPublicUser(b.subcontractor) })),
    _count: { bids: j.bids.length },
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  }))

  return NextResponse.json({ jobs: result })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'CONTRACTOR') {
    return NextResponse.json({ error: 'Only contractors can post jobs' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const { title, description, trade, category, budgetMin, budgetMax, location, city, state, duration, crewSize, urgency } = body
    if (!title || !description || !trade || !location || budgetMin == null || budgetMax == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const job = await db.job.create({
      data: {
        title,
        description,
        trade,
        category: category || 'General',
        budgetMin: Number(budgetMin),
        budgetMax: Number(budgetMax),
        location,
        city: city || null,
        state: state || null,
        duration: duration || 'Flexible',
        crewSize: Number(crewSize) || 1,
        urgency: urgency || 'STANDARD',
        contractorId: session.userId,
      },
      include: { contractor: true, bids: { include: { subcontractor: true } } },
    })
    return NextResponse.json({
      job: {
        ...job,
        contractor: toPublicUser(job.contractor),
        bids: job.bids.map((b) => ({ ...b, subcontractor: toPublicUser(b.subcontractor) })),
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
