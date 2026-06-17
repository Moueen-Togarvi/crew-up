import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notify } from '@/lib/notify'

// POST /api/bids/[id]/withdraw — subcontractor withdraws their own PENDING bid
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bid = await db.bid.findUnique({
    where: { id },
    include: { job: { include: { contractor: true } } },
  })
  if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 })

  // Only the bid's owner can withdraw it
  if (bid.subcontractorId !== session.userId) {
    return NextResponse.json({ error: 'Only the bid owner can withdraw it' }, { status: 403 })
  }

  // Cannot withdraw accepted or rejected bids
  if (bid.status !== 'PENDING') {
    return NextResponse.json(
      { error: `Cannot withdraw a bid that has already been ${bid.status.toLowerCase()}` },
      { status: 400 },
    )
  }

  const job = bid.job
  const contractor = job.contractor

  // Load the subcontractor's display name for the notification body
  const sub = await db.user.findUnique({
    where: { id: session.userId },
    select: { name: true },
  })

  // Fully remove the bid so it is withdrawn cleanly
  await db.bid.delete({ where: { id } })

  // Notify the contractor that the bid was withdrawn
  await notify({
    userId: contractor.id,
    type: 'BID_REJECTED',
    title: 'Bid withdrawn',
    body: `${sub?.name ?? 'A subcontractor'} withdrew their bid on "${job.title}".`,
    link: job.id,
  })

  return NextResponse.json({ ok: true })
}
