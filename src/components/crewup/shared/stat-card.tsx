'use client'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * A polished stat card with gradient icon chip, label, optional sublabel, and
 * a hover lift micro-interaction. Designed for dashboard/analytics KPI rows.
 */
interface StatCardProps {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  sublabel?: string
  /** Tailwind text-* class — color of the icon */
  accent?: string
  /** Tailwind from-* to-* classes — gradient background for the icon chip */
  chipGradient?: string
  loading?: boolean
  /** Optional small sparkline element rendered in the top-right corner */
  trailing?: React.ReactNode
  className?: string
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  accent = 'text-primary',
  chipGradient = 'from-primary/15 to-primary/5',
  loading = false,
  trailing,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('lift-card relative overflow-hidden p-5', className)}>
      {/* Top-right accent corner */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-xl" />
      <div className="relative flex items-start justify-between">
        <span className={cn(
          'grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ring-1 ring-border',
          chipGradient,
          accent
        )}>
          <Icon className="h-5 w-5" />
        </span>
        {trailing}
      </div>
      <div className="relative mt-4">
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <p className="text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl">
            {value}
          </p>
        )}
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
        {sublabel && (
          <p className="mt-1 text-[11px] text-muted-foreground/80">{sublabel}</p>
        )}
      </div>
    </Card>
  )
}

/**
 * A row of skeleton stat cards used while data is loading. Mirrors the layout
 * of StatCard so the layout doesn't shift.
 */
export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-5">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="mt-4 h-7 w-20" />
          <Skeleton className="mt-1 h-3 w-16" />
        </Card>
      ))}
    </>
  )
}
