import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// POST /api/notifications/[id]/read — mark one notification as read
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await db.notification.updateMany({
    where: { id, userId: session.userId },
    data: { read: true },
  })
  return NextResponse.json({ ok: true })
}
