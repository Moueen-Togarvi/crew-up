import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { toPublicUser } from '@/lib/serialize'

export async function POST(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const token = searchParams.get('token')
  const { password } = await req.json()

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
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

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetExpires: null,
      },
    })

    // Optionally sign a new session for the user
    // const token = await signSession({ userId: user.id, email: user.email, role: user.role })
    // await setSessionCookie(token)

    return NextResponse.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Password reset failed' }, { status: 500 })
  }
}