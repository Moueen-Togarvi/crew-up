'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { URGENCY } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function TradeBadge({ trade, className }: { trade: string; className?: string }) {
  return (
    <Badge variant="secondary" className={cn('font-medium', className)}>
      {trade}
    </Badge>
  )
}

export function UrgencyBadge({ urgency, className }: { urgency: string; className?: string }) {
  const u = URGENCY.find((x) => x.value === urgency)
  if (!u) return null
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', u.color)} />
      {u.label}
    </Badge>
  )
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <Badge className={cn('gap-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15', className)}>
      <ShieldCheck className="h-3 w-3" /> Verified
    </Badge>
  )
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const map: Record<string, { label: string; cls: string; icon?: React.ReactNode }> = {
    OPEN: { label: 'Open', cls: 'bg-emerald-500/10 text-emerald-600' },
    ASSIGNED: { label: 'Assigned', cls: 'bg-amber-500/10 text-amber-600' },
    COMPLETED: { label: 'Completed', cls: 'bg-primary/10 text-primary' },
    CANCELLED: { label: 'Cancelled', cls: 'bg-muted text-muted-foreground' },
    PENDING: { label: 'Pending', cls: 'bg-amber-500/10 text-amber-600' },
    ACCEPTED: { label: 'Accepted', cls: 'bg-emerald-500/10 text-emerald-600' },
    REJECTED: { label: 'Rejected', cls: 'bg-muted text-muted-foreground' },
    ACTIVE: { label: 'Active', cls: 'bg-emerald-500/10 text-emerald-600' },
    PAST_DUE: { label: 'Past due', cls: 'bg-red-500/10 text-red-600' },
    CANCELED: { label: 'Canceled', cls: 'bg-muted text-muted-foreground' },
  }
  const s = map[status] || { label: status, cls: 'bg-muted' }
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium border-0', s.cls, className)}>
      {s.label}
    </Badge>
  )
}
