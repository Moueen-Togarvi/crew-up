'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { Rating } from '@/components/crewup/shared/rating'
import { VerifiedBadge } from '@/components/crewup/shared/badges'
import { formatMoney, formatMoneyFull } from '@/components/crewup/shared/format'
import { cn } from '@/lib/utils'
import type { BidWithUser } from '@/lib/constants'
import {
  GitCompare,
  Crown,
  Award,
  TrendingUp,
  DollarSign,
  Clock,
  MapPin,
  ArrowLeft,
  Star,
  CheckCircle2,
  Loader2,
  Wrench,
  X,
  Sparkles,
} from 'lucide-react'

interface BidComparisonDialogProps {
  bids: BidWithUser[]
  budgetMin: number
  budgetMax: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccept?: (bidId: string) => void
}

/* ──────────────────── Budget position mini-bar ──────────────────── */

function BudgetPositionBar({
  amount,
  min,
  max,
}: {
  amount: number
  min: number
  max: number
}) {
  const range = max - min || 1
  const pct = Math.max(0, Math.min(100, ((amount - min) / range) * 100))
  const withinBudget = amount >= min && amount <= max
  const over = amount > max
  const under = amount < min

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="font-medium">Budget position</span>
        <span
          className={cn(
            'font-semibold',
            withinBudget && 'text-emerald-600',
            over && 'text-rose-600',
            under && 'text-amber-600',
          )}
        >
          {withinBudget ? 'Within budget' : over ? 'Over budget' : 'Under min'}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-muted/60 overflow-hidden">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400/30 via-amber-500/50 to-orange-500/30" />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-background bg-amber-500 shadow-sm shadow-amber-500/40"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{formatMoney(min)}</span>
        <span>{formatMoney(max)}</span>
      </div>
    </div>
  )
}

/* ──────────────────── Main dialog ──────────────────── */

export function BidComparisonDialog({
  bids,
  budgetMin,
  budgetMax,
  open,
  onOpenChange,
  onAccept,
}: BidComparisonDialogProps) {
  const [mode, setMode] = React.useState<'select' | 'compare'>('select')
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [expandedMessages, setExpandedMessages] = React.useState<Set<string>>(new Set())
  const [acceptingId, setAcceptingId] = React.useState<string | null>(null)

  // Reset state shortly after the dialog closes so the close animation is smooth.
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setMode('select')
        setSelectedIds(new Set())
        setExpandedMessages(new Set())
        setAcceptingId(null)
      }, 200)
      return () => clearTimeout(t)
    }
  }, [open])

  const pendingBids = React.useMemo(
    () => bids.filter((b) => b.status === 'PENDING'),
    [bids],
  )

  const selectedBids = React.useMemo(
    () => pendingBids.filter((b) => selectedIds.has(b.id)),
    [pendingBids, selectedIds],
  )

  const toggleBid = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= 4) return prev
        next.add(id)
      }
      return next
    })
  }

  const toggleMessage = (id: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAccept = async (bidId: string) => {
    if (!onAccept) return
    setAcceptingId(bidId)
    try {
      await onAccept(bidId)
    } finally {
      setAcceptingId(null)
    }
  }

  // Highlight computations
  const highlights = React.useMemo(() => {
    if (selectedBids.length === 0) {
      return { bestPriceId: null, topRatedId: null, mostExperiencedId: null }
    }
    let bestPriceId: string | null = null
    let topRatedId: string | null = null
    let mostExperiencedId: string | null = null
    let bestPrice = Infinity
    let topRating = -Infinity
    let mostJobs = -Infinity
    for (const b of selectedBids) {
      if (b.amount < bestPrice) {
        bestPrice = b.amount
        bestPriceId = b.id
      }
      const r = b.subcontractor.rating || 0
      if (r > topRating) {
        topRating = r
        topRatedId = b.id
      }
      const jobs = b.subcontractor.jobsCompleted || 0
      if (jobs > mostJobs) {
        mostJobs = jobs
        mostExperiencedId = b.id
      }
    }
    return { bestPriceId, topRatedId, mostExperiencedId }
  }, [selectedBids])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
      >
        {/* ────────── Gradient header ────────── */}
        <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-6 text-white">
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)]" />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 rounded-md bg-white/15 p-1.5 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative flex items-start gap-4 pr-10">
            <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm ring-1 ring-white/20">
              <GitCompare className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                {mode === 'select' ? 'Compare bids' : 'Bid comparison'}
              </DialogTitle>
              <DialogDescription className="text-white/85 mt-1 text-sm">
                {mode === 'select' ? (
                  <>
                    Pick 2–4 bids to compare side-by-side · Budget range{' '}
                    <span className="font-semibold text-white">
                      {formatMoneyFull(budgetMin)} – {formatMoneyFull(budgetMax)}
                    </span>
                  </>
                ) : (
                  <>
                    Side-by-side comparison of{' '}
                    <span className="font-semibold text-white">
                      {selectedBids.length} bid{selectedBids.length === 1 ? '' : 's'}
                    </span>{' '}
                    · Budget{' '}
                    <span className="font-semibold text-white">
                      {formatMoneyFull(budgetMin)} – {formatMoneyFull(budgetMax)}
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* ────────── Body ────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'select' ? (
            <SelectionView
              pendingBids={pendingBids}
              selectedIds={selectedIds}
              onToggle={toggleBid}
            />
          ) : (
            <ComparisonView
              bids={selectedBids}
              highlights={highlights}
              expandedMessages={expandedMessages}
              onToggleMessage={toggleMessage}
              onAccept={onAccept}
              acceptingId={acceptingId}
              onHandleAccept={handleAccept}
              budgetMin={budgetMin}
              budgetMax={budgetMax}
            />
          )}
        </div>

        {/* ────────── Footer ────────── */}
        <div className="border-t bg-muted/30 px-6 py-3 flex items-center justify-between gap-3">
          {mode === 'select' ? (
            <>
              <p className="text-xs text-muted-foreground">
                {selectedIds.size === 0
                  ? 'Select at least 2 bids to compare'
                  : selectedIds.size === 1
                    ? '1 selected · pick 1 more to compare'
                    : selectedIds.size < 4
                      ? `${selectedIds.size} selected · add up to ${4 - selectedIds.size} more`
                      : '4 selected · max reached'}
              </p>
              <Button
                disabled={selectedIds.size < 2}
                onClick={() => setMode('compare')}
                className="gap-2"
              >
                <GitCompare className="h-4 w-4" />
                Compare ({selectedIds.size})
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setMode('select')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back to selection
              </Button>
              <p className="text-xs text-muted-foreground">
                Comparing {selectedBids.length} bid
                {selectedBids.length === 1 ? '' : 's'}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ──────────────────── Selection view ──────────────────── */

function SelectionView({
  pendingBids,
  selectedIds,
  onToggle,
}: {
  pendingBids: BidWithUser[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
}) {
  if (pendingBids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <GitCompare className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-medium text-sm">No pending bids to compare</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Once subcontractors submit bids on this job, you&apos;ll be able to
          compare them side-by-side here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Pending bids · {pendingBids.length}
      </p>
      {pendingBids.map((bid) => {
        const checked = selectedIds.has(bid.id)
        const disabled = !checked && selectedIds.size >= 4
        return (
          <div
            key={bid.id}
            role="checkbox"
            aria-checked={checked}
            tabIndex={disabled ? -1 : 0}
            onClick={() => !disabled && onToggle(bid.id)}
            onKeyDown={(e) => {
              if (disabled) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onToggle(bid.id)
              }
            }}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-3 transition-all outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              checked
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'hover:bg-muted/40 cursor-pointer',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Checkbox
              checked={checked}
              disabled={disabled}
              className="pointer-events-none"
              tabIndex={-1}
            />
            <UserAvatar user={bid.subcontractor} className="h-10 w-10 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm truncate">
                  {bid.subcontractor.name}
                </p>
                {bid.subcontractor.verified && (
                  <VerifiedBadge className="text-[10px] px-1.5 py-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                {bid.subcontractor.trade && (
                  <span className="inline-flex items-center gap-1">
                    <Wrench className="h-3 w-3" />
                    {bid.subcontractor.trade}
                  </span>
                )}
                <span className="text-border">·</span>
                <Rating
                  value={bid.subcontractor.rating}
                  count={bid.subcontractor.reviewCount}
                />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-base">
                {formatMoneyFull(bid.amount)}
              </p>
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1 justify-end">
                <Clock className="h-3 w-3" />
                {bid.duration}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ──────────────────── Comparison view ──────────────────── */

function ComparisonView({
  bids,
  highlights,
  expandedMessages,
  onToggleMessage,
  onAccept,
  acceptingId,
  onHandleAccept,
  budgetMin,
  budgetMax,
}: {
  bids: BidWithUser[]
  highlights: {
    bestPriceId: string | null
    topRatedId: string | null
    mostExperiencedId: string | null
  }
  expandedMessages: Set<string>
  onToggleMessage: (id: string) => void
  onAccept?: (bidId: string) => void
  acceptingId: string | null
  onHandleAccept: (bidId: string) => void
  budgetMin: number
  budgetMax: number
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:overflow-x-auto pb-2">
      {bids.map((bid, idx) => {
        const isBestPrice = bid.id === highlights.bestPriceId
        const isTopRated = bid.id === highlights.topRatedId
        const isMostExperienced = bid.id === highlights.mostExperiencedId
        const expanded = expandedMessages.has(bid.id)
        const isAccepting = acceptingId === bid.id
        const message = bid.message || ''
        const longMessage = message.length > 120

        return (
          <Card
            key={bid.id}
            className={cn(
              'relative flex-1 min-w-[240px] overflow-hidden py-0 gap-0 animate-fade-in-up',
              isBestPrice
                ? 'ring-2 ring-emerald-500/50 shadow-md shadow-emerald-500/10'
                : 'shadow-sm',
            )}
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            {/* Top gradient accent */}
            <div
              className={cn(
                'h-1.5 w-full',
                isBestPrice
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                  : 'bg-gradient-to-r from-amber-400 to-orange-500',
              )}
            />

            <div className="p-4 space-y-4">
              {/* Subcontractor header */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <UserAvatar user={bid.subcontractor} className="h-10 w-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">
                      {bid.subcontractor.name}
                    </p>
                    {bid.subcontractor.company && (
                      <p className="text-xs text-muted-foreground truncate">
                        {bid.subcontractor.company}
                      </p>
                    )}
                  </div>
                </div>
                {bid.subcontractor.verified && (
                  <VerifiedBadge className="text-[10px] px-1.5 py-0" />
                )}
              </div>

              {/* Highlight badges */}
              {(isBestPrice || isTopRated || isMostExperienced) && (
                <div className="flex flex-wrap gap-1.5">
                  {isBestPrice && (
                    <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 border-0">
                      <DollarSign className="h-3 w-3" /> Best price
                    </Badge>
                  )}
                  {isTopRated && (
                    <Badge className="gap-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 border-0">
                      <Crown className="h-3 w-3" /> Top rated
                    </Badge>
                  )}
                  {isMostExperienced && (
                    <Badge className="gap-1 bg-orange-500/10 text-orange-600 hover:bg-orange-500/15 border-0">
                      <Award className="h-3 w-3" /> Most experienced
                    </Badge>
                  )}
                </div>
              )}

              {/* Bid amount */}
              <div
                className={cn(
                  'rounded-lg p-3 text-center',
                  isBestPrice
                    ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30'
                    : 'bg-muted/40',
                )}
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Bid amount
                </p>
                <p
                  className={cn(
                    'text-2xl font-bold mt-0.5',
                    isBestPrice ? 'text-emerald-600' : 'text-foreground',
                  )}
                >
                  {formatMoneyFull(bid.amount)}
                </p>
              </div>

              {/* Rating */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  Rating
                </span>
                <Rating
                  value={bid.subcontractor.rating}
                  count={bid.subcontractor.reviewCount}
                />
              </div>

              {/* Jobs completed */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Jobs done
                </span>
                <span
                  className={cn(
                    'text-sm font-semibold',
                    isMostExperienced && 'text-orange-600',
                  )}
                >
                  {bid.subcontractor.jobsCompleted}
                </span>
              </div>

              {/* Trade & location */}
              <div className="space-y-1.5 border-t pt-3">
                {bid.subcontractor.trade && (
                  <div className="flex items-center gap-2 text-xs">
                    <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{bid.subcontractor.trade}</span>
                  </div>
                )}
                {(bid.subcontractor.city || bid.subcontractor.state) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {[bid.subcontractor.city, bid.subcontractor.state]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Duration */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Duration
                </span>
                <span className="text-sm font-medium">{bid.duration}</span>
              </div>

              {/* Message */}
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-1 inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Message
                </p>
                <p
                  className={cn(
                    'text-xs text-foreground/80 leading-relaxed',
                    !expanded && 'line-clamp-3',
                  )}
                >
                  {message || 'No message provided.'}
                </p>
                {longMessage && (
                  <button
                    type="button"
                    onClick={() => onToggleMessage(bid.id)}
                    className="text-xs text-primary hover:underline mt-1.5 font-medium"
                  >
                    {expanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>

              {/* Budget position mini-bar */}
              <div className="border-t pt-3">
                <BudgetPositionBar
                  amount={bid.amount}
                  min={budgetMin}
                  max={budgetMax}
                />
              </div>

              {/* Accept bid */}
              {onAccept && (
                <Button
                  className="w-full gap-2"
                  disabled={isAccepting}
                  onClick={() => onHandleAccept(bid.id)}
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Accepting…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Accept bid
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
