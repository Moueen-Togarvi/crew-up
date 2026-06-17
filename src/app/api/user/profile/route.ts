import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { toPublicUser } from '@/lib/serialize'

// Allowed fields for self-update (never trust the client for role/plan/rating/etc.)
const ALLOWED_FIELDS = new Set([
  'name',
  'company',
  'phone',
  'city',
  'state',
  'avatarUrl',
  'bio',
  'trade',
  'skills',
  'hourlyRate',
])

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as Record<string, unknown>
    const update: Record<string, unknown> = {}

    for (const key of Object.keys(body)) {
      if (!ALLOWED_FIELDS.has(key)) continue
      const val = body[key]
      // Allow null to clear optional fields; otherwise validate basic types
      if (val === null || val === undefined) {
        update[key] = null
        continue
      }
      if (key === 'hourlyRate') {
        const n = Number(val)
        if (Number.isFinite(n) && n >= 0 && n <= 10000) update[key] = n
        continue
      }
      if (typeof val === 'string') {
        // Basic length guards
        const trimmed = val.slice(0, key === 'bio' ? 1000 : key === 'skills' ? 500 : 200)
        update[key] = trimmed || null
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const updated = await db.user.update({
      where: { id: session.userId },
      data: update,
    })

    return NextResponse.json({ user: toPublicUser(updated) })
  } catch {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
