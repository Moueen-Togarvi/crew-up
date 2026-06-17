import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/notifications — list current user's notifications
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ notifications: [], unreadCount: 0 })
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') || 30)

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    db.notification.count({ where: { userId: session.userId, read: false } }),
  ])

  return NextResponse.json({
    notifications: notifications.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
    unreadCount,
  })
}

// POST /api/notifications/read-all — mark all as read
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await db.notification.updateMany({
    where: { userId: session.userId, read: false },
    data: { read: true },
  })
  return NextResponse.json({ ok: true })
}
