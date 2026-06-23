import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toPublicUser } from '@/lib/serialize'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Verification token is required' }, { status: 400 })
  }

  try {
    const user = await db.user.findUnique({
      where: { verificationToken: token },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 })
    }

    // Update user with verified email
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null,
      },
    })

    return NextResponse.json({ success: true, message: 'Email verified successfully' })
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}