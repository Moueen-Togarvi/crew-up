import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signSession, setSessionCookie, getSession, SESSION_COOKIE_NAME } from '@/lib/auth'
import { toPublicUser } from '@/lib/serialize'

// Google's public certs for ID token verification — cache JWK fetches in-memory
let cachedJwks: { keys: JsonWebKey[]; fetchedAt: number } | null = null
const JWKS_CACHE_MS = 3600_000 // 1 hour

async function fetchGoogleCerts(): Promise<JsonWebKey[]> {
  const now = Date.now()
  if (cachedJwks && now - cachedJwks.fetchedAt < JWKS_CACHE_MS) {
    return cachedJwks.keys
  }
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs')
  const jwks = await res.json()
  cachedJwks = { keys: jwks.keys, fetchedAt: now }
  return jwks.keys
}

async function verifyGoogleIdToken(idToken: string): Promise<{ email: string; name: string; picture?: string } | null> {
  try {
    // Decode header to get key ID
    const parts = idToken.split('.')
    if (parts.length !== 3) return null
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString())
    const kid = header.kid
    const alg = header.alg

    if (alg !== 'RS256') return null

    // Fetch matching key
    const keys = await fetchGoogleCerts()
    const jwk = keys.find((k: any) => k.kid === kid && k.alg === alg)
    if (!jwk) return null

    // Import the key and verify the JWT
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())

    // Verify expiry
    if (payload.exp && payload.exp < Date.now() / 1000) return null

    // Verify audience
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (clientId && payload.aud !== clientId) return null

    // Verify issuer
    if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') return null

    // Verify signature
    const signature = Buffer.from(parts[2], 'base64url')
    const signedData = Buffer.from(parts[0] + '.' + parts[1])
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, signedData)
    if (!valid) return null

    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.redirect(new URL('/?error=oauth_error', req.url))
  }

  try {
    // Validate state parameter to prevent CSRF
    if (!state || state.length < 16) {
      return NextResponse.redirect(new URL('/?error=oauth_error', req.url))
    }

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

    // Verify the ID token using Google's public keys
    const decoded = await verifyGoogleIdToken(idToken)

    if (!decoded || !decoded.email || !decoded.name) {
      throw new Error('Invalid Google OAuth response')
    }

    // Check if user exists
    let user = await db.user.findUnique({
      where: { email: decoded.email.toLowerCase().trim() },
    })

    if (!user) {
      // Create new user with Google OAuth
      user = await db.user.create({
        data: {
          email: decoded.email.toLowerCase().trim(),
          name: decoded.name,
          avatarUrl: decoded.picture || null,
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
    const token = await signSession({ userId: user.id, email: user.email, role: user.role, sessionVersion: user.sessionVersion })
    await setSessionCookie(token)

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', req.url))
  } catch (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(new URL('/?error=oauth_failed', req.url))
  }
}
