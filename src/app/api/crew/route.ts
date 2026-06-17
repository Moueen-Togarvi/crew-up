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

// GET /api/crew — list current user's crew members
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const members = await db.crewMember.findMany({
    where: { ownerUserId: session.userId },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ members: members.map(serialize) })
}

// POST /api/crew — add a new crew member
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'SUBCONTRACTOR') {
    return NextResponse.json({ error: 'Only subcontractors can manage a crew' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, role, trade, phone, email, hourlyRate, notes } = body as {
      name?: string
      role?: string
      trade?: string
      phone?: string
      email?: string
      hourlyRate?: number | string
      notes?: string
    }

    if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
      return NextResponse.json({ error: 'Name is required (1-100 characters)' }, { status: 400 })
    }
    if (typeof role !== 'string' || role.trim().length === 0 || role.trim().length > 100) {
      return NextResponse.json({ error: 'Role is required (1-100 characters)' }, { status: 400 })
    }

    let rate: number | null = null
    if (hourlyRate !== undefined && hourlyRate !== null && hourlyRate !== '') {
      const n = Number(hourlyRate)
      if (Number.isNaN(n) || n < 0) {
        return NextResponse.json({ error: 'Hourly rate must be a positive number' }, { status: 400 })
      }
      rate = n
    }

    const member = await db.crewMember.create({
      data: {
        ownerUserId: session.userId,
        name: name.trim(),
        role: role.trim(),
        trade: typeof trade === 'string' && trade.trim() ? trade.trim() : null,
        phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
        email: typeof email === 'string' && email.trim() ? email.trim() : null,
        hourlyRate: rate,
        notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
        status: 'ACTIVE',
      },
    })

    return NextResponse.json({ member: serialize(member) }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to create crew member' }, { status: 500 })
  }
}
