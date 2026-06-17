'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Star, Loader2 } from 'lucide-react'

export interface ReviewTarget {
  id: string
  name: string
  company?: string | null
  avatarUrl?: string | null
}

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetUser: ReviewTarget | null
  jobId?: string
  jobTitle?: string
  onSubmitted?: () => void
}

const STAR_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very good',
  5: 'Excellent',
}

const MAX_COMMENT = 500
const MIN_COMMENT = 10

export function ReviewDialog({
  open,
  onOpenChange,
  targetUser,
  jobId,
  jobTitle,
  onSubmitted,
}: ReviewDialogProps) {
  const { toast } = useToast()
  const [rating, setRating] = React.useState(0)
  const [hoverRating, setHoverRating] = React.useState(0)
  const [comment, setComment] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  // Reset internal state shortly after the dialog closes so the close animation is smooth.
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setRating(0)
        setHoverRating(0)
        setComment('')
        setSubmitting(false)
      }, 200)
      return () => clearTimeout(t)
    }
  }, [open])

  const displayRating = hoverRating || rating
  const trimmedComment = comment.trim()
  const canSubmit =
    !!targetUser && rating >= 1 && trimmedComment.length >= MIN_COMMENT

  const handleSubmit = async () => {
    if (!targetUser || !canSubmit) return
    setSubmitting(true)
    try {
      await api('/api/reviews', {
        method: 'POST',
        body: {
          targetId: targetUser.id,
          jobId: jobId ?? null,
          rating,
          comment: trimmedComment,
        },
      })
      toast({
        title: 'Review submitted',
        description: `Thanks for reviewing ${targetUser.name.split(' ')[0]}!`,
      })
      onSubmitted?.()
      onOpenChange(false)
    } catch (e) {
      toast({
        title: 'Failed to submit review',
        description: (e as Error).message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 gap-0 sm:max-w-md">
        {/* Top gradient accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary to-amber-400" />

        <div className="p-6">
          <DialogHeader>
            {targetUser ? (
              <div className="flex items-center gap-3">
                <UserAvatar
                  user={{ name: targetUser.name, avatarUrl: targetUser.avatarUrl }}
                  className="h-12 w-12 ring-2 ring-amber-500/30"
                />
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base leading-snug">
                    Leave a review for {targetUser.name}
                  </DialogTitle>
                  <DialogDescription className="truncate">
                    {jobTitle ? (
                      <>
                        For job:{' '}
                        <span className="font-medium text-foreground/80">
                          {jobTitle}
                        </span>
                      </>
                    ) : targetUser.company ? (
                      targetUser.company
                    ) : (
                      <>Share your experience working together.</>
                    )}
                  </DialogDescription>
                </div>
              </div>
            ) : (
              <DialogTitle className="text-base">Leave a review</DialogTitle>
            )}
          </DialogHeader>

          {/* Star rating */}
          <div className="mt-6">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Rating
            </Label>
            <div
              className="mt-2 flex items-center gap-1.5 animate-fade-in-up"
              style={{ animationDelay: '100ms' }}
              onMouseLeave={() => setHoverRating(0)}
            >
              {[1, 2, 3, 4, 5].map((value) => {
                const isActive = value <= displayRating
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} star${value === 1 ? '' : 's'} — ${STAR_LABELS[value]}`}
                    onMouseEnter={() => setHoverRating(value)}
                    onClick={() => setRating(value)}
                    disabled={submitting}
                    className="rounded-md p-1 transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Star
                      className={cn(
                        'h-7 w-7 transition-colors duration-150',
                        isActive
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground',
                      )}
                    />
                  </button>
                )
              })}
              <span
                className={cn(
                  'ml-2 min-w-[80px] text-sm font-medium',
                  displayRating > 0
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-muted-foreground',
                )}
              >
                {displayRating > 0 ? STAR_LABELS[displayRating] : 'Tap to rate'}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="review-comment"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Your review
              </Label>
              <span
                className={cn(
                  'text-[11px] tabular-nums',
                  comment.length > MAX_COMMENT
                    ? 'text-rose-500'
                    : 'text-muted-foreground',
                )}
              >
                {comment.length} / {MAX_COMMENT}
              </span>
            </div>
            <Textarea
              id="review-comment"
              placeholder="Share details about your experience working together…"
              rows={4}
              maxLength={MAX_COMMENT}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={submitting}
              className="mt-2 min-h-[96px] resize-y"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Minimum {MIN_COMMENT} characters
            </p>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 fill-current" />
                  Submit review
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
