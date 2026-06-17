import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { toPublicUser } from '@/lib/serialize'

// GET /api/auth/me — return the current authenticated user (or null)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ user: null })
  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ user: null })
  return NextResponse.json({ user: toPublicUser(user) })
}

// PATCH /api/auth/me — update the current user's profile
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed: Record<string, unknown> = {}

  const fields = ['name', 'company', 'phone', 'city', 'state', 'avatarUrl', 'bio', 'trade', 'skills']
  for (const f of fields) {
    if (body[f] !== undefined) allowed[f] = body[f] === '' ? null : body[f]
  }
  if (body.hourlyRate !== undefined) {
    allowed.hourlyRate = body.hourlyRate === '' || body.hourlyRate == null ? null : Number(body.hourlyRate)
  }

  const updated = await db.user.update({
    where: { id: session.userId },
    data: allowed,
  })

  return NextResponse.json({ user: toPublicUser(updated) })
}
