import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signSession, setSessionCookie } from '@/lib/auth'
import { toPublicUser } from '@/lib/serialize'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.redirect(new URL('/?error=oauth_error', req.url))
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange token')
    }

    const tokens = await tokenResponse.json()
    const idToken = tokens.id_token

    // Decode ID token
    const base64Url = idToken.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        })
        .join('')
    )
    const decoded = JSON.parse(jsonPayload)

    const email = decoded.email
    const name = decoded.name
    const picture = decoded.picture

    if (!email || !name) {
      throw new Error('Invalid Google OAuth response')
    }

    // Check if user exists
    let user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user) {
      // Create new user with Google OAuth
      user = await db.user.create({
        data: {
          email: email.toLowerCase().trim(),
          name: name,
          avatarUrl: picture || null,
          passwordHash: '', // No password for OAuth users
          role: 'SUBCONTRACTOR', // Default role for new users
          verified: true, // Auto-verify OAuth users
          emailVerified: new Date(),
        },
      })

      await db.subscription.create({
        data: { userId: user.id, plan: 'FREE', status: 'ACTIVE' },
      })
    }

    // Set session cookie
    const token = await signSession({ userId: user.id, email: user.email, role: user.role })
    await setSessionCookie(token)

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', req.url))
  } catch (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(new URL('/?error=oauth_failed', req.url))
  }
}