import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toPublicUser } from '@/lib/serialize'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const trade = searchParams.get('trade')
  const state = searchParams.get('state')
  const q = searchParams.get('q')
  const sort = searchParams.get('sort') || 'rating'

  const where: Record<string, unknown> = { role: 'SUBCONTRACTOR' }
  if (trade && trade !== 'ALL') where.trade = trade
  if (state && state !== 'ALL') where.state = state
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { company: { contains: q } },
      { skills: { contains: q } },
      { bio: { contains: q } },
    ]
  }

  const orderBy =
    sort === 'rate'
      ? { hourlyRate: 'asc' as const }
      : sort === 'jobs'
      ? { jobsCompleted: 'desc' as const }
      : { rating: 'desc' as const }

  const users = await db.user.findMany({ where, orderBy, take: 100 })
  return NextResponse.json({ users: users.map(toPublicUser) })
}
