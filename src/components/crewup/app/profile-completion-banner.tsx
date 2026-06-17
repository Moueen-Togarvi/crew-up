'use client'

import { useMemo } from 'react'
import { useApp } from '@/lib/store'
import type { PublicUser } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Circle, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface ChecklistItem {
  key: string
  label: string
  done: boolean
  cta?: () => void
}

/**
 * Profile completion banner shown on the dashboard when profile is < 100%.
 * Computes a checklist based on the user's role and surface completion %.
 */
export function ProfileCompletionBanner({ user }: { user: PublicUser }) {
  const setView = useApp((s) => s.setView)
  const [dismissed, setDismissed] = useState(false)

  const items = useMemo<ChecklistItem[]>(() => {
    const goSettings = () => setView('settings')
    const base: ChecklistItem[] = [
      { key: 'name', label: 'Full name', done: !!user.name, cta: goSettings },
      { key: 'avatar', label: 'Profile photo', done: !!user.avatarUrl, cta: goSettings },
      { key: 'bio', label: 'Bio / headline', done: !!user.bio && user.bio.trim().length > 0, cta: goSettings },
      { key: 'phone', label: 'Phone number', done: !!user.phone, cta: goSettings },
      { key: 'location', label: 'City & state', done: !!user.city && !!user.state, cta: goSettings },
    ]
    if (user.role === 'CONTRACTOR') {
      base.push({ key: 'company', label: 'Company name', done: !!user.company, cta: goSettings })
    } else {
      base.push(
        { key: 'trade', label: 'Trade', done: !!user.trade, cta: goSettings },
        { key: 'skills', label: 'Skills', done: !!user.skills && user.skills.trim().length > 0, cta: goSettings },
        { key: 'hourly', label: 'Hourly rate', done: typeof user.hourlyRate === 'number' && user.hourlyRate > 0, cta: goSettings },
      )
    }
    return base
  }, [user, setView])

  const doneCount = items.filter((i) => i.done).length
  const total = items.length
  const pct = Math.round((doneCount / total) * 100)

  if (dismissed || pct === 100) return null

  const nextItem = items.find((i) => !i.done)

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-amber-50 via-card to-orange-50 p-5 dark:from-amber-950/20 dark:via-card dark:to-orange-950/20">
      {/* Decorative gradient bar */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-amber-400 to-primary bg-[length:200%_100%] animate-border-pan" aria-hidden="true" />

      {/* Decorative sparkle */}
      <Sparkles className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 text-primary/5" aria-hidden="true" />

      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold tracking-tight">
              {pct < 50 ? 'Let\u2019s set up your profile' : 'Almost there — finish your profile'}
            </h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              {pct}%
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            A complete profile gets up to <strong className="text-foreground">3.2\u00d7 more inquiries</strong> and helps the right partners find you.
          </p>

          <div className="mt-3 max-w-md">
            <Progress value={pct} className="h-2" />
          </div>

          {/* Checklist */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {items.map((item) => (
              <div
                key={item.key}
                className={cn(
                  'flex items-center gap-1.5 text-xs',
                  item.done ? 'text-muted-foreground line-through' : 'font-medium text-foreground'
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-primary/60" />
                )}
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {nextItem?.cta && (
            <Button onClick={nextItem.cta} className="sweep-on-hover shadow-md">
              {pct < 50 ? 'Start now' : 'Finish profile'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('profile')}
            className="text-muted-foreground"
          >
            View profile
          </Button>
        </div>
      </div>
    </Card>
  )
}
