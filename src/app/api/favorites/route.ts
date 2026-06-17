import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { toPublicUser } from '@/lib/serialize'

// GET /api/favorites?type=job|sub — list the current user's favorites
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ favorites: [] })
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'all'

  const where: Record<string, unknown> = { userId: session.userId }
  if (type === 'job') where.jobId = { not: null }
  if (type === 'sub') where.targetUserId = { not: null }

  const favs = await db.favorite.findMany({
    where,
    include: { job: { include: { contractor: true, bids: { include: { subcontractor: true }, orderBy: { amount: 'asc' } } } }, targetUser: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    favorites: favs.map((f) => ({
      id: f.id,
      createdAt: f.createdAt.toISOString(),
      job: f.job
        ? {
            ...f.job,
            contractor: toPublicUser(f.job.contractor),
            bids: f.job.bids.map((b) => ({ ...b, subcontractor: toPublicUser(b.subcontractor), createdAt: b.createdAt.toISOString() })),
            createdAt: f.job.createdAt.toISOString(),
            updatedAt: f.job.updatedAt.toISOString(),
          }
        : null,
      targetUser: f.targetUser ? toPublicUser(f.targetUser) : null,
    })),
  })
}

// POST /api/favorites — add a favorite { jobId? | targetUserId? }
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { jobId, targetUserId } = await req.json()
  if (!jobId && !targetUserId) {
    return NextResponse.json({ error: 'Must specify jobId or targetUserId' }, { status: 400 })
  }
  if (targetUserId === session.userId) {
    return NextResponse.json({ error: 'Cannot favorite yourself' }, { status: 400 })
  }

  // upsert — avoid duplicates via unique constraints
  const existing = await db.favorite.findFirst({
    where: { userId: session.userId, OR: [{ jobId: jobId || null }, { targetUserId: targetUserId || null }] },
  })
  if (existing) return NextResponse.json({ favorite: existing, alreadyFavorited: true })

  const fav = await db.favorite.create({
    data: { userId: session.userId, jobId: jobId || null, targetUserId: targetUserId || null },
  })
  return NextResponse.json({ favorite: fav })
}

// DELETE /api/favorites?id=... — remove a favorite
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const jobId = searchParams.get('jobId')
  const targetUserId = searchParams.get('targetUserId')

  if (id) {
    await db.favorite.deleteMany({ where: { id, userId: session.userId } })
  } else if (jobId) {
    await db.favorite.deleteMany({ where: { userId: session.userId, jobId } })
  } else if (targetUserId) {
    await db.favorite.deleteMany({ where: { userId: session.userId, targetUserId } })
  } else {
    return NextResponse.json({ error: 'Must specify id, jobId, or targetUserId' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
