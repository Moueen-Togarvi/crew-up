import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateResetToken, getResetUrl, formatResetEmail, sendEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit({ key: `forgot-password:${ip}`, max: 5, windowMs: 60 * 60 * 1000 }) // 5 per hour
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  try {
    const { email } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const resetToken = generateResetToken()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resetUrl = getResetUrl(baseUrl, resetToken)

    await db.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    })

    await sendEmail({
      to: user.email,
      subject: 'Reset your password - CrewUp',
      html: formatResetEmail(user.name, resetUrl),
    })

    return NextResponse.json({ success: true, message: 'Password reset email sent' })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Failed to send password reset email' }, { status: 500 })
  }
}