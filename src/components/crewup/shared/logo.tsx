'use client'

import { HardHat } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <HardHat className="h-5 w-5" strokeWidth={2.2} />
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-background" />
      </div>
      {showText && (
        <span className="text-xl font-extrabold tracking-tight">
          Crew<span className="text-primary">Up</span>
        </span>
      )}
    </div>
  )
}
