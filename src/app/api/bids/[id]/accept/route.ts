import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notify } from '@/lib/notify'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Perform the entire accept flow inside a single transaction to prevent
  // TOCTOU races (two concurrent requests both seeing the bid as PENDING).
  const result = await db.$transaction(async (tx) => {
    const bid = await tx.bid.findUnique({
      where: { id },
      include: { job: true },
    })
    if (!bid) return null

    if (bid.job.contractorId !== session.userId) {
      return { error: 'Only the job owner can accept bids', status: 403 }
    }
    if (bid.status !== 'PENDING') {
      return { error: 'Bid is no longer pending', status: 409 }
    }
    if (bid.job.status !== 'OPEN') {
      return { error: 'Job is no longer open for bidding', status: 400 }
    }

    // Accept this bid, reject others, mark job assigned
    const [, rejectedBids] = await Promise.all([
      tx.bid.update({ where: { id }, data: { status: 'ACCEPTED' } }),
      tx.bid.updateMany({
        where: { jobId: bid.jobId, id: { not: id }, status: 'PENDING' },
        data: { status: 'REJECTED' },
      }),
      tx.job.update({
        where: { id: bid.jobId },
        data: { status: 'ASSIGNED', assignedToId: bid.subcontractorId },
      }),
    ])

    return { bid, job: bid.job, rejectedCount: rejectedBids.count }
  })

  if (!result) {
    return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
  }
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status as number })
  }

  const { bid, job, rejectedCount } = result

  // Notify the accepted subcontractor
  await notify({
    userId: bid.subcontractorId,
    type: 'BID_ACCEPTED',
    title: 'Bid accepted! 🎉',
    body: `Your bid on "${job.title}" was accepted by the contractor.`,
    link: job.id,
  })

  // Notify rejected subcontractors (best-effort, outside transaction)
  if (rejectedCount > 0) {
    const others = await db.bid.findMany({
      where: { jobId: job.id, id: { not: id }, status: 'REJECTED' },
      select: { subcontractorId: true },
    })
    for (const o of others) {
      await notify({
        userId: o.subcontractorId,
        type: 'BID_REJECTED',
        title: 'Bid update',
        body: `Your bid on "${job.title}" was not selected this time.`,
        link: job.id,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
