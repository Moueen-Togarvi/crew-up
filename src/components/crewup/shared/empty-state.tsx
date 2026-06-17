'use client'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  /** Optional accent color override (defaults to primary). Use Tailwind text-* class. */
  accentClassName?: string
  /** Compact variant for in-card empty states */
  compact?: boolean
  className?: string
}

/**
 * A polished, reusable empty state with a gradient icon halo, heading, optional
 * description, and optional call-to-action. Consistent across the app.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  accentClassName = 'text-primary',
  compact = false,
  className,
}: EmptyStateProps) {
  if (compact) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 text-center', className)}>
        <span className={cn(
          'grid h-12 w-12 place-items-center rounded-xl bg-muted',
          accentClassName
        )}>
          <Icon className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-semibold">{title}</p>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        {actionLabel && onAction && (
          <Button size="sm" variant="outline" className="mt-3" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={cn('flex flex-col items-center justify-center border-dashed p-10 text-center', className)}>
      <div className="relative">
        {/* Soft gradient halo */}
        <div className={cn(
          'absolute -inset-4 rounded-full opacity-20 blur-xl',
          accentClassName.replace('text-', 'bg-')
        )} />
        <span className={cn(
          'relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-muted to-muted/30 ring-1 ring-border',
          accentClassName
        )}>
          <Icon className="h-7 w-7" />
        </span>
      </div>
      <p className="mt-5 text-base font-bold">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button className="mt-5 sweep-on-hover" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Card>
  )
}
