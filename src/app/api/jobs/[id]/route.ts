import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { toPublicUser } from '@/lib/serialize'
import { notify } from '@/lib/notify'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const job = await db.job.findUnique({
    where: { id },
    include: {
      contractor: true,
      bids: { include: { subcontractor: true }, orderBy: { amount: 'asc' } },
    },
  })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  return NextResponse.json({
    job: {
      ...job,
      contractor: toPublicUser(job.contractor),
      bids: job.bids.map((b) => ({ ...b, subcontractor: toPublicUser(b.subcontractor), createdAt: b.createdAt.toISOString() })),
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    },
  })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const job = await db.job.findUnique({ where: { id }, include: { contractor: true } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.contractorId !== session.userId) {
    return NextResponse.json({ error: 'Only the job owner can update it' }, { status: 403 })
  }
  const body = await req.json()

  // ---- CANCELLED transition ----------------------------------------------
  // Contractors can cancel their own OPEN or ASSIGNED jobs. Accepted bid (if any)
  // is voided (set to REJECTED), and all affected subcontractors are notified.
  if (body.status === 'CANCELLED') {
    if (job.status !== 'OPEN' && job.status !== 'ASSIGNED') {
      return NextResponse.json(
        { error: `Cannot cancel a job that is already ${job.status.toLowerCase()}` },
        { status: 400 },
      )
    }

    // Load all bids so we can notify affected subs
    const bids = await db.bid.findMany({
      where: { jobId: id },
      select: { id: true, subcontractorId: true, status: true },
    })
    const acceptedBid = bids.find((b) => b.status === 'ACCEPTED') ?? null
    const pendingBids = bids.filter((b) => b.status === 'PENDING')

    const updated = await db.job.update({
      where: { id },
      data: { status: 'CANCELLED', assignedToId: null },
      include: { contractor: true, bids: { include: { subcontractor: true } } },
    })

    // Void the accepted bid, if any
    if (acceptedBid) {
      await db.bid.update({ where: { id: acceptedBid.id }, data: { status: 'REJECTED' } })
      await notify({
        userId: acceptedBid.subcontractorId,
        type: 'BID_REJECTED',
        title: 'Job cancelled',
        body: `${job.contractor.name} cancelled "${job.title}". Your accepted bid has been voided.`,
        link: job.id,
      })
    }

    // Notify all subs with pending bids
    for (const b of pendingBids) {
      await notify({
        userId: b.subcontractorId,
        type: 'BID_REJECTED',
        title: 'Job cancelled',
        body: `${job.contractor.name} cancelled "${job.title}". Your bid is no longer being considered.`,
        link: job.id,
      })
    }

    return NextResponse.json({
      job: {
        ...updated,
        contractor: toPublicUser(updated.contractor),
        bids: updated.bids.map((b) => ({ ...b, subcontractor: toPublicUser(b.subcontractor), createdAt: b.createdAt.toISOString() })),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  }

  // ---- REOPEN transition -------------------------------------------------
  // Contractors can reopen a CANCELLED job back to OPEN, but only if no bid is
  // currently in the ACCEPTED state (the accepted bid was voided on cancel, but
  // we check defensively in case of state drift).
  if (body.status === 'REOPEN') {
    if (job.status !== 'CANCELLED') {
      return NextResponse.json(
        { error: `Cannot reopen a job that is ${job.status.toLowerCase()}` },
        { status: 400 },
      )
    }

    const acceptedBid = await db.bid.findFirst({
      where: { jobId: id, status: 'ACCEPTED' },
      select: { id: true },
    })
    if (acceptedBid) {
      return NextResponse.json(
        { error: 'Cannot reopen a job with an accepted bid' },
        { status: 400 },
      )
    }

    const updated = await db.job.update({
      where: { id },
      data: { status: 'OPEN' },
      include: { contractor: true, bids: { include: { subcontractor: true } } },
    })

    return NextResponse.json({
      job: {
        ...updated,
        contractor: toPublicUser(updated.contractor),
        bids: updated.bids.map((b) => ({ ...b, subcontractor: toPublicUser(b.subcontractor), createdAt: b.createdAt.toISOString() })),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  }

  // ---- Default path (existing) -------------------------------------------
  // Accepts status='COMPLETED' (and legacy status assignments) plus
  // assignedToId updates. COMPLETED notifies the assigned sub + bumps their
  // completed-jobs counter.

  // Whitelist allowed status values to prevent arbitrary injection
  const ALLOWED_STATUSES = new Set(['OPEN', 'ASSIGNED', 'COMPLETED', 'CANCELLED'])
  if (body.status && !ALLOWED_STATUSES.has(body.status)) {
    return NextResponse.json({ error: `Invalid status value: "${body.status}"` }, { status: 400 })
  }

  const updated = await db.job.update({
    where: { id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.assignedToId !== undefined ? { assignedToId: body.assignedToId } : {}),
    },
    include: { contractor: true, bids: { include: { subcontractor: true } } },
  })

  // When a contractor marks an assigned job as completed, notify the assigned sub
  // and bump their completed-jobs counter.
  if (body.status === 'COMPLETED' && job.status !== 'COMPLETED' && updated.assignedToId) {
    await notify({
      userId: updated.assignedToId,
      type: 'JOB_ASSIGNED',
      title: 'Job marked complete ✅',
      body: `"${updated.title}" was marked complete by the contractor. Leave a review!`,
      link: updated.id,
    })
    await db.user.update({
      where: { id: updated.assignedToId },
      data: { jobsCompleted: { increment: 1 } },
    })
  }

  return NextResponse.json({
    job: {
      ...updated,
      contractor: toPublicUser(updated.contractor),
      bids: updated.bids.map((b) => ({ ...b, subcontractor: toPublicUser(b.subcontractor), createdAt: b.createdAt.toISOString() })),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  })
}
