export function formatMoney(n: number): string {
  if (n >= 1000) {
    return '$' + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(/\.0$/, '') + 'k'
  }
  return '$' + n.toLocaleString()
}

export function formatMoneyFull(n: number): string {
  return '$' + n.toLocaleString()
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  const wk = Math.floor(day / 7)
  if (wk < 5) return `${wk}w ago`
  const mo = Math.floor(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return new Date(iso).toLocaleDateString()
}
