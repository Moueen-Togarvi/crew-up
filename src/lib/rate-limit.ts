const store = new Map<string, { count: number; resetAt: number }>()
let lastCleanup = Date.now()

export function rateLimit(opts: {
  key: string
  max: number
  windowMs: number
}): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()

  if (now - lastCleanup > 60_000) {
    for (const [k, v] of store) {
      if (now > v.resetAt) store.delete(k)
    }
    lastCleanup = now
  }

  const entry = store.get(opts.key)

  if (!entry || now > entry.resetAt) {
    store.set(opts.key, { count: 1, resetAt: now + opts.windowMs })
    return { allowed: true, remaining: opts.max - 1, resetAt: now + opts.windowMs }
  }

  if (entry.count >= opts.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: opts.max - entry.count, resetAt: entry.resetAt }
}
