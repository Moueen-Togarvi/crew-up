import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// NOTE: In production this would create a Stripe Checkout Session / Subscription.
// For this demo we simulate a successful subscription and store the plan.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { plan } = await req.json()
  if (!['PRO', 'ENTERPRISE'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }
  const periodEnd = new Date()
  periodEnd.setDate(periodEnd.getDate() + 30)

  const sub = await db.subscription.upsert({
    where: { userId: session.userId },
    update: { plan, status: 'ACTIVE', currentPeriodEnd: periodEnd, stripeSubId: `sim_sub_${Date.now()}` },
    create: { userId: session.userId, plan, status: 'ACTIVE', currentPeriodEnd: periodEnd, stripeSubId: `sim_sub_${Date.now()}` },
  })
  await db.user.update({ where: { id: session.userId }, data: { plan } })
  if (plan === 'PRO' || plan === 'ENTERPRISE') {
    await db.user.update({ where: { id: session.userId }, data: { verified: true } })
  }
  return NextResponse.json({ subscription: { ...sub, currentPeriodEnd: sub.currentPeriodEnd?.toISOString() } })
}
