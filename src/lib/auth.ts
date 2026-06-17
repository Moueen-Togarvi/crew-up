import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'crewup_session'

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret === 'crewup-dev-secret-change-me-in-production-please') {
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

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  return await verifySession(token)
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
