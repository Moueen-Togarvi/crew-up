// Lightweight fetch helper for the BuildUp API
export async function api<T = unknown>(
  path: string,
  opts?: { method?: string; body?: unknown; headers?: Record<string, string> }
): Promise<T> {
  const res = await fetch(path, {
    method: opts?.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Request failed')
  }
  return data as T
}
