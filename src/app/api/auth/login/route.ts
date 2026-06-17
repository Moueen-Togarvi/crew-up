import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { signSession, setSessionCookie } from '@/lib/auth'
import { toPublicUser } from '@/lib/serialize'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit({ key: `login:${ip}`, max: 10, windowMs: 60_000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 })
  }

  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    const token = await signSession({ userId: user.id, email: user.email, role: user.role })
    await setSessionCookie(token)
    return NextResponse.json({ user: toPublicUser(user) })
  } catch (e) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
