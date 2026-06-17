import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { signSession, setSessionCookie } from '@/lib/auth'
import { toPublicUser } from '@/lib/serialize'
import { rateLimit } from '@/lib/rate-limit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit({ key: `signup:${ip}`, max: 5, windowMs: 60_000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many signup attempts. Try again later.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { email, password, name, role, company, trade, city, state, phone } = body
    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (!['CONTRACTOR', 'SUBCONTRACTOR'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name,
        role,
        company: company || null,
        trade: role === 'SUBCONTRACTOR' ? trade || null : null,
        city: city || null,
        state: state || null,
        phone: phone || null,
        verified: false,
      },
    })
    await db.subscription.create({
      data: { userId: user.id, plan: 'FREE', status: 'ACTIVE' },
    })
    const token = await signSession({ userId: user.id, email: user.email, role: user.role })
    await setSessionCookie(token)
    return NextResponse.json({ user: toPublicUser(user) })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 })
  }
}
