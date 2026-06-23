import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateVerificationToken, getVerificationUrl, formatVerificationEmail, sendEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit({ key: `resend-verification:${ip}`, max: 3, windowMs: 60 * 60 * 1000 }) // 3 per hour
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

    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 })
    }

    const verificationToken = generateVerificationToken()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const verificationUrl = getVerificationUrl(baseUrl, verificationToken)

    await db.user.update({
      where: { id: user.id },
      data: { verificationToken },
    })

    await sendEmail({
      to: user.email,
      subject: 'Verify your email - CrewUp',
      html: formatVerificationEmail(user.name, verificationUrl),
    })

    return NextResponse.json({ success: true, message: 'Verification email sent' })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json({ error: 'Failed to resend verification email' }, { status: 500 })
  }
}