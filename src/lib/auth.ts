import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

const SESSION_COOKIE = 'buildup_session'

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret === 'buildup-dev-secret-change-me-in-production-please') {
    throw new Error(
      'SESSION_SECRET environment variable is required. Generate one with: openssl rand -base64 48'
    )
  }
  return new TextEncoder().encode(secret)
}

export interface SessionPayload {
  userId: string
  email: string
  role: string
  /** Incremented on the User model whenever a password is changed; old JWTs are rejected. */
  sessionVersion: number
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(getSecret())
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

/**
 * Get the current session, verifying both the JWT signature AND that the
 * `sessionVersion` stored in the token still matches the value in the DB.
 *
 * Returns `null` if the cookie is missing, the token is invalid/expired,
 * or the sessionVersion has changed (e.g. password was reset).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const payload = await verifySession(token)
  if (!payload) return null

  // Verify sessionVersion hasn't been bumped (password change invalidates old sessions)
  try {
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { sessionVersion: true },
    })
    if (!user || user.sessionVersion !== payload.sessionVersion) {
      return null
    }
  } catch {
    // If DB is unreachable, fail closed — deny the session
    return null
  }

  return payload
}

export async function setSessionCookie(token: string) {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
