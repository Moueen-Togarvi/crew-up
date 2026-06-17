import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://21.0.13.39:81',
]

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

export function middleware(request: NextRequest) {
  const { method } = request

  if (MUTATION_METHODS.includes(method)) {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')

    const hasValidOrigin =
      origin && ALLOWED_ORIGINS.some((allowed) => origin === allowed || origin.startsWith(allowed + '/') || origin.startsWith(allowed + ':'))

    const hasValidReferer =
      referer && ALLOWED_ORIGINS.some((allowed) => referer.startsWith(allowed))

    if (!hasValidOrigin && !hasValidReferer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
