import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ subscription: null })
  const sub = await db.subscription.findUnique({ where: { userId: session.userId } })
  if (!sub) return NextResponse.json({ subscription: null })
  return NextResponse.json({
    subscription: {
      ...sub,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    },
  })
}
