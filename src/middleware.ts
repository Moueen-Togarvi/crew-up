import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * CSRF protection middleware.
 *
 * For mutating requests (POST/PUT/PATCH/DELETE) we require either:
 *   1. An `Origin` header that exactly matches the app URL, or
 *   2. A `Referer` header whose origin exactly matches the app URL.
 *
 * In development we also allow common localhost origins so the dev
 * workflow isn't broken. Hardcoded LAN / public IPs are intentionally
 * excluded — use NEXT_PUBLIC_APP_URL to add them instead.
 */

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

function buildAllowedOrigins(): string[] {
  // Always include loopback for dev
  const dev = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000']

  // If NEXT_PUBLIC_APP_URL is set, use it (and strip any trailing path)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    try {
      const parsed = new URL(appUrl)
      dev.push(parsed.origin)
    } catch {
      // ignore malformed values
    }
  }

  return dev
}

function isExactOriginMatch(value: string, allowed: string[]): boolean {
  if (!value) return false
  try {
    // Parse the full URL to get just the origin (scheme + host + port)
    const parsed = new URL(value)
    const origin = parsed.origin
    return allowed.some((a) => origin === a)
  } catch {
    // Not a valid URL — can't match
    return false
  }
}

export function middleware(request: NextRequest) {
  const { method } = request

  if (MUTATION_METHODS.includes(method)) {
    const allowed = buildAllowedOrigins()
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')

    if (!isExactOriginMatch(origin, allowed) && !isExactOriginMatch(referer, allowed)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
