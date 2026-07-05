import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { toPublicUser } from '@/lib/serialize'
import { signSession, setSessionCookie, SESSION_COOKIE_NAME } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit({ key: `reset-password:${ip}`, max: 5, windowMs: 60_000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many reset attempts. Try again later.' }, { status: 429 })
  }

  const searchParams = req.nextUrl.searchParams
  const token = searchParams.get('token')
  const { password } = await req.json()

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
  }

  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: 'Password must be 8-128 characters' }, { status: 400 })
  }
  if (!/[A-Z]/.test(password)) {
    return NextResponse.json({ error: 'Password must contain at least one uppercase letter' }, { status: 400 })
  }
  if (!/[0-9]/.test(password)) {
    return NextResponse.json({ error: 'Password must contain at least one digit' }, { status: 400 })
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return NextResponse.json({ error: 'Password must contain at least one special character' }, { status: 400 })
  }

  try {
    const user = await db.user.findUnique({
      where: { resetToken: token },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid reset token' }, { status: 400 })
    }

    if (!user.resetExpires || user.resetExpires < new Date()) {
      return NextResponse.json({ error: 'Reset token has expired' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Invalidate old sessions by incrementing sessionVersion
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetExpires: null,
        sessionVersion: { increment: 1 },
      },
    })

    // Auto-login after password reset (new session will have updated version)
    // Fetch the updated user to get the new sessionVersion
    const updatedUser = await db.user.findUnique({ where: { id: user.id }, select: { sessionVersion: true } })
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found after update' }, { status: 500 })
    }
    const sessionToken = await signSession({ userId: user.id, email: user.email, role: user.role, sessionVersion: updatedUser.sessionVersion })
    await setSessionCookie(sessionToken)

    return NextResponse.json({ success: true, message: 'Password reset successfully', user: toPublicUser(user) })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Password reset failed' }, { status: 500 })
  }
}
