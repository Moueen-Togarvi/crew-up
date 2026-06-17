'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Rating({ value, count, className, size = 'sm' }: { value: number; count?: number; className?: string; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Star className={cn('fill-amber-400 text-amber-400', sz)} />
      <span className="font-semibold text-sm">{value ? value.toFixed(1) : 'New'}</span>
      {count != null && count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
    </div>
  )
}
