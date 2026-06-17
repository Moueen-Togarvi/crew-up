import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { toPublicUser } from '@/lib/serialize'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const targetId = searchParams.get('targetId')
  if (!targetId) return NextResponse.json({ reviews: [] })
  const reviews = await db.review.findMany({
    where: { targetId },
    include: { author: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({
    reviews: reviews.map((r) => ({
      ...r,
      author: toPublicUser(r.author),
      createdAt: r.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { targetId, rating, comment, jobId } = await req.json()
  if (!targetId || !rating || !comment) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
  }
  if (targetId === session.userId) {
    return NextResponse.json({ error: 'Cannot review yourself' }, { status: 400 })
  }
  const review = await db.review.create({
    data: { authorId: session.userId, targetId, rating: Number(rating), comment, jobId: jobId || null },
  })
  // recompute target rating
  const agg = await db.review.aggregate({
    where: { targetId },
    _avg: { rating: true },
    _count: { rating: true },
  })
  await db.user.update({
    where: { id: targetId },
    data: {
      rating: agg._avg.rating || 0,
      reviewCount: agg._count.rating,
    },
  })
  return NextResponse.json({ review: { ...review, createdAt: review.createdAt.toISOString() } })
}
