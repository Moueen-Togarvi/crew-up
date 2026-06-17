import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

function serialize(m: {
  id: string
  ownerUserId: string
  name: string
  role: string
  trade: string | null
  phone: string | null
  email: string | null
  hourlyRate: number | null
  status: string
  notes: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: m.id,
    ownerUserId: m.ownerUserId,
    name: m.name,
    role: m.role,
    trade: m.trade,
    phone: m.phone,
    email: m.email,
    hourlyRate: m.hourlyRate,
    status: m.status,
    notes: m.notes,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }
}

const ALLOWED_STATUSES = new Set(['ACTIVE', 'ON_JOB', 'UNAVAILABLE'])

// PATCH /api/crew/[id] — update a crew member
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.crewMember.findUnique({ where: { id } })
  if (!existing || existing.ownerUserId !== session.userId) {
    return NextResponse.json({ error: 'Crew member not found' }, { status: 404 })
  }

  const body = await req.json()
  const data: {
    name?: string
    role?: string
    trade?: string | null
    phone?: string | null
    email?: string | null
    hourlyRate?: number | null
    status?: string
    notes?: string | null
  } = {}

  if (typeof body.name === 'string') {
    if (body.name.trim().length === 0 || body.name.trim().length > 100) {
      return NextResponse.json({ error: 'Name must be 1-100 characters' }, { status: 400 })
    }
    data.name = body.name.trim()
  }
  if (typeof body.role === 'string') {
    if (body.role.trim().length === 0 || body.role.trim().length > 100) {
      return NextResponse.json({ error: 'Role must be 1-100 characters' }, { status: 400 })
    }
    data.role = body.role.trim()
  }
  if (typeof body.trade === 'string') {
    data.trade = body.trade.trim() ? body.trade.trim() : null
  }
  if (typeof body.phone === 'string') {
    data.phone = body.phone.trim() ? body.phone.trim() : null
  }
  if (typeof body.email === 'string') {
    data.email = body.email.trim() ? body.email.trim() : null
  }
  if (body.hourlyRate !== undefined && body.hourlyRate !== null) {
    if (body.hourlyRate === '') {
      data.hourlyRate = null
    } else {
      const n = Number(body.hourlyRate)
      if (Number.isNaN(n) || n < 0) {
        return NextResponse.json({ error: 'Hourly rate must be a positive number' }, { status: 400 })
      }
      data.hourlyRate = n
    }
  }
  if (typeof body.status === 'string') {
    if (!ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    data.status = body.status
  }
  if (typeof body.notes === 'string') {
    data.notes = body.notes.trim() ? body.notes.trim() : null
  }

  const updated = await db.crewMember.update({ where: { id }, data })
  return NextResponse.json({ member: serialize(updated) })
}

// DELETE /api/crew/[id] — remove a crew member
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.crewMember.findUnique({ where: { id } })
  if (!existing || existing.ownerUserId !== session.userId) {
    return NextResponse.json({ error: 'Crew member not found' }, { status: 404 })
  }

  await db.crewMember.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
