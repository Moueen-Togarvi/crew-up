import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { signSession, setSessionCookie } from '@/lib/auth'
import { toPublicUser } from '@/lib/serialize'
import { rateLimit } from '@/lib/rate-limit'
import { generateVerificationToken, generateVerificationUrl, formatVerificationEmail, sendEmail } from '@/lib/email'
import { v4 as uuidv4 } from 'uuid'
import { signupSchema } from '@/lib/validations'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit({ key: `signup:${ip}`, max: 5, windowMs: 60_000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many signup attempts. Try again later.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const parsed = signupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }
    const { email, password, name, role, company, trade, city, state, phone } = parsed.data

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }
    const passwordHash = await bcrypt.hash(password, 12)
    const verificationToken = generateVerificationToken()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

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
        verificationToken,
        verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    })
    await db.subscription.create({
      data: { userId: user.id, plan: 'FREE', status: 'ACTIVE' },
    })

    // Send verification email
    const verificationUrl = generateVerificationUrl(baseUrl, verificationToken)
    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify your email - BuildUp',
        html: formatVerificationEmail(user.name, verificationUrl),
      })
    } catch (e) {
      console.error('Failed to send verification email:', e)
      // Don't fail signup if email fails, just log it
    }

    const token = await signSession({ userId: user.id, email: user.email, role: user.role, sessionVersion: user.sessionVersion })
    await setSessionCookie(token)
    return NextResponse.json({ user: toPublicUser(user) })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 })
  }
}
