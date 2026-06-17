import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toPublicUser } from '@/lib/serialize'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const state = searchParams.get('state')
  const q = searchParams.get('q')
  const where: Record<string, unknown> = { role: 'CONTRACTOR' }
  if (state && state !== 'ALL') where.state = state
  if (q) {
    where.OR = [{ name: { contains: q } }, { company: { contains: q } }]
  }
  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({ users: users.map(toPublicUser) })
}
