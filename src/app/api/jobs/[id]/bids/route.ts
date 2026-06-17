import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { toPublicUser } from '@/lib/serialize'
import { notify } from '@/lib/notify'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const job = await db.job.findUnique({ where: { id }, select: { contractorId: true } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const isOwner = job.contractorId === session.userId
  const isBidder = await db.bid.findFirst({ where: { jobId: id, subcontractorId: session.userId } })
  if (!isOwner && !isBidder) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const bids = await db.bid.findMany({
    where: { jobId: id },
    include: { subcontractor: true },
    orderBy: { amount: 'asc' },
  })
  return NextResponse.json({
    bids: bids.map((b) => ({ ...b, subcontractor: toPublicUser(b.subcontractor), createdAt: b.createdAt.toISOString() })),
  })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'SUBCONTRACTOR') {
    return NextResponse.json({ error: 'Only subcontractors can bid' }, { status: 403 })
  }
  const job = await db.job.findUnique({ where: { id } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.status !== 'OPEN') return NextResponse.json({ error: 'This job is no longer accepting bids' }, { status: 400 })
  if (job.contractorId === session.userId) {
    return NextResponse.json({ error: 'You cannot bid on your own job' }, { status: 400 })
  }
  const existing = await db.bid.findFirst({ where: { jobId: id, subcontractorId: session.userId } })
  if (existing) return NextResponse.json({ error: 'You have already bid on this job' }, { status: 400 })
  const body = await req.json()
  const { amount, message, duration } = body
  if (!amount || !message) return NextResponse.json({ error: 'Amount and message are required' }, { status: 400 })
  const bid = await db.bid.create({
    data: {
      amount: Number(amount),
      message,
      duration: duration || 'Flexible',
      jobId: id,
      subcontractorId: session.userId,
    },
    include: { subcontractor: true, job: true },
  })

  await notify({
    userId: job.contractorId,
    type: 'NEW_BID',
    title: 'New bid received 🛠️',
    body: `${bid.subcontractor.name} bid $${Number(amount).toLocaleString()} on "${job.title}".`,
    link: job.id,
  })

  return NextResponse.json({
    bid: { ...bid, subcontractor: toPublicUser(bid.subcontractor), createdAt: bid.createdAt.toISOString() },
  })
}
