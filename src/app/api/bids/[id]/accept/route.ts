import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notify } from '@/lib/notify'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const bid = await db.bid.findUnique({ where: { id }, include: { job: true } })
  if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
  if (bid.job.contractorId !== session.userId) {
    return NextResponse.json({ error: 'Only the job owner can accept bids' }, { status: 403 })
  }
  // accept this bid, reject others, mark job assigned
  const [_, rejectedBids] = await db.$transaction([
    db.bid.update({ where: { id }, data: { status: 'ACCEPTED' } }),
    db.bid.updateMany({ where: { jobId: bid.jobId, id: { not: id }, status: 'PENDING' }, data: { status: 'REJECTED' } }),
    db.job.update({ where: { id: bid.jobId }, data: { status: 'ASSIGNED', assignedToId: bid.subcontractorId } }),
  ])

  const job = bid.job

  // Notify the accepted subcontractor
  await notify({
    userId: bid.subcontractorId,
    type: 'BID_ACCEPTED',
    title: 'Bid accepted! 🎉',
    body: `Your bid on "${job.title}" was accepted by the contractor.`,
    link: job.id,
  })

  // Notify rejected subcontractors
  if (rejectedBids && rejectedBids.count > 0) {
    const others = await db.bid.findMany({
      where: { jobId: bid.jobId, id: { not: id }, status: 'REJECTED' },
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
