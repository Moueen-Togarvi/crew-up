'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import type { JobWithRelations, PublicUser } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { TradeBadge, StatusBadge, UrgencyBadge, VerifiedBadge } from '@/components/crewup/shared/badges'
import { Rating } from '@/components/crewup/shared/rating'
import { formatMoney, timeAgo, formatMoneyFull } from '@/components/crewup/shared/format'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, MapPin, Clock, Users, DollarSign, FileText, CheckCircle2, MessageSquare, Star, Send, Loader2, ShieldCheck, Check, HardHat, Trash2, XCircle, RotateCcw, AlertTriangle, GitCompare } from 'lucide-react'
import { BidComparisonDialog } from '@/components/crewup/app/bid-comparison-dialog'
import { MilestoneTracker } from '@/components/crewup/app/milestone-tracker'
import { ReviewDialog, type ReviewTarget } from '@/components/crewup/app/review-dialog'

/* ──────────────────── Status Stepper ──────────────────── */

const PIPELINE_STEPS = ['OPEN', 'ASSIGNED', 'COMPLETED'] as const

function StatusStepper({ status }: { status: string }) {
  const cancelled = status === 'CANCELLED'
  const currentIdx = PIPELINE_STEPS.indexOf(status as typeof PIPELINE_STEPS[number])

  return (
    <div className="flex items-center gap-0">
      {PIPELINE_STEPS.map((step, i) => {
        const isActive = !cancelled && i <= currentIdx
        const isCurrent = !cancelled && step === status
        const isLast = i === PIPELINE_STEPS.length - 1

        return (
          <div key={step} className="flex items-center">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-full border-2 text-sm font-bold transition-all duration-300',
                  cancelled
                    ? 'border-rose-400 bg-rose-500/10 text-rose-500'
                    : isActive
                      ? 'border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/25'
                      : 'border-border bg-muted/50 text-muted-foreground',
                  isCurrent && !cancelled && 'ring-4 ring-amber-500/20 scale-110'
                )}
              >
                {cancelled ? (
                  <XCircle className="h-4 w-4" />
                ) : isActive ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider',
                  cancelled
                    ? 'text-rose-500'
                    : isCurrent
                      ? 'text-amber-600 dark:text-amber-400'
                      : isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                )}
              >
                {cancelled ? 'Cancelled' : step}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'mx-2 h-0.5 w-10 sm:w-16 rounded-full transition-all duration-300',
                  cancelled
                    ? 'bg-rose-300 dark:bg-rose-700'
                    : !cancelled && i < currentIdx
                      ? 'bg-amber-500'
                      : 'bg-border'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ──────────────────── Budget Range Bar ──────────────────── */

function BudgetRangeBar({
  budgetMin,
  budgetMax,
  bids,
}: {
  budgetMin: number
  budgetMax: number
  bids: { amount: number; status: string }[]
}) {
  const range = budgetMax - budgetMin || 1
  const acceptedBid = bids.find((b) => b.status === 'ACCEPTED')
  const pendingBids = bids.filter((b) => b.status === 'PENDING')

  const toPercent = (val: number) => Math.max(0, Math.min(100, ((val - budgetMin) / range) * 100))

  return (
    <div className="mt-4 space-y-1.5">
      <div className="relative h-3 w-full rounded-full bg-muted/60 overflow-hidden">
        {/* Filled range */}
        <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-gradient-to-r from-amber-400/30 via-amber-500/50 to-orange-500/30" />

        {/* Pending bid markers */}
        {pendingBids.map((bid, i) => (
          <div
            key={i}
            className="absolute top-1/2 h-2.5 w-1 -translate-y-1/2 rounded-full bg-amber-600/70"
            style={{ left: `${toPercent(bid.amount)}%` }}
          />
        ))}

        {/* Accepted bid marker */}
        {acceptedBid && (
          <div
            className="absolute top-1/2 h-3.5 w-1.5 -translate-y-1/2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40"
            style={{ left: `${toPercent(acceptedBid.amount)}%` }}
          />
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{formatMoneyFull(budgetMin)}</span>
        <span>{formatMoneyFull(budgetMax)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-1 rounded-full bg-amber-600/70" /> Bid
        </span>
        {acceptedBid && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-1.5 rounded-full bg-emerald-500" /> Accepted
          </span>
        )}
      </div>
    </div>
  )
}

/* ──────────────────── Trade color helper ──────────────────── */

function getTradeAccent(trade: string | null | undefined): string {
  const map: Record<string, string> = {
    Electrical: 'border-l-yellow-500',
    Plumbing: 'border-l-blue-500',
    HVAC: 'border-l-red-500',
    Roofing: 'border-l-orange-600',
    Framing: 'border-l-amber-700',
    Masonry: 'border-l-stone-500',
    Painting: 'border-l-violet-500',
    Flooring: 'border-l-teal-500',
    Landscaping: 'border-l-green-600',
    'General Contracting': 'border-l-amber-500',
    Carpentry: 'border-l-yellow-700',
    Concrete: 'border-l-gray-500',
    Drywall: 'border-l-sand-500',
    Insulation: 'border-l-pink-400',
    Welding: 'border-l-orange-500',
    Excavation: 'border-l-yellow-800',
    Demolition: 'border-l-red-700',
    'Solar Installation': 'border-l-amber-400',
    Steel: 'border-l-slate-500',
    Tile: 'border-l-cyan-500',
  }
  return (trade && map[trade]) || 'border-l-amber-500'
}

/* ──────────────────── Main Component ──────────────────── */

export function JobDetailView() {
  const jobId = useApp((s) => s.activeJobId)
  const user = useApp((s) => s.user)
  const setView = useApp((s) => s.setView)
  const openProfile = useApp((s) => s.openProfile)
  const openConversation = useApp((s) => s.openConversation)
  const openAuth = useApp((s) => s.openAuth)
  const { toast } = useToast()

  const [job, setJob] = useState<JobWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [bidAmount, setBidAmount] = useState('')
  const [bidDuration, setBidDuration] = useState('')
  const [bidMessage, setBidMessage] = useState('')
  const [bidding, setBidding] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  const openReviewFor = (target: ReviewTarget) => {
    setReviewTarget(target)
    setReviewOpen(true)
  }

  const load = async () => {
    if (!jobId) return
    setLoading(true)
    try {
      const { job } = await api<{ job: JobWithRelations }>(`/api/jobs/${jobId}`)
      setJob(job)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [jobId])

  const submitBid = async () => {
    if (!user) { openAuth('login'); return }
    if (user.role !== 'SUBCONTRACTOR') {
      toast({ title: 'Only subcontractors can bid', variant: 'destructive' })
      return
    }
    if (!bidAmount || !bidMessage) {
      toast({ title: 'Amount and message are required', variant: 'destructive' })
      return
    }
    setBidding(true)
    try {
      await api(`/api/jobs/${jobId}/bids`, { method: 'POST', body: { amount: Number(bidAmount), message: bidMessage, duration: bidDuration || job?.duration } })
      toast({ title: 'Bid submitted!', description: 'The contractor will review your bid.' })
      setBidAmount(''); setBidMessage(''); setBidDuration('')
      load()
    } catch (e) {
      toast({ title: 'Bid failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setBidding(false)
    }
  }

  const acceptBid = async (bidId: string): Promise<boolean> => {
    setAccepting(bidId)
    try {
      await api(`/api/bids/${bidId}/accept`, { method: 'POST' })
      toast({ title: 'Bid accepted', description: 'The subcontractor has been notified.' })
      load()
      return true
    } catch (e) {
      toast({ title: 'Failed to accept bid', description: (e as Error).message, variant: 'destructive' })
      return false
    } finally {
      setAccepting(null)
    }
  }

  // Used by the BidComparisonDialog — accept via the existing flow, then close on success.
  const handleCompareAccept = async (bidId: string) => {
    const ok = await acceptBid(bidId)
    if (ok) setCompareOpen(false)
  }

  const messageContractor = async () => {
    if (!user) { openAuth('login'); return }
    if (!job) return
    try {
      const { conversationId } = await api<{ conversationId: string }>('/api/messages/conversations', {
        method: 'POST', body: { targetUserId: job.contractorId, jobId: job.id, body: `Hi ${job.contractor.name.split(' ')[0]}, I'm interested in your job: ${job.title}` },
      })
      openConversation(conversationId)
    } catch (e) {
      toast({ title: 'Failed to start conversation', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const messageAssignedSub = async () => {
    if (!user) { openAuth('login'); return }
    if (!job) return
    const acceptedBid = job.bids.find((b) => b.status === 'ACCEPTED')
    if (!acceptedBid) return
    try {
      const { conversationId } = await api<{ conversationId: string }>('/api/messages/conversations', {
        method: 'POST', body: { targetUserId: acceptedBid.subcontractorId, jobId: job.id, body: `Hi ${acceptedBid.subcontractor.name.split(' ')[0]}, regarding our job: ${job.title}` },
      })
      openConversation(conversationId)
    } catch (e) {
      toast({ title: 'Failed to start conversation', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const markComplete = async () => {
    if (!job) return
    setCompleting(true)
    try {
      // Capture the accepted bid before the status patch so we can prompt for a review right after.
      const targetBid = job.bids.find((b) => b.status === 'ACCEPTED')
      await api(`/api/jobs/${job.id}`, { method: 'PATCH', body: { status: 'COMPLETED' } })
      toast({ title: 'Job marked complete ✅', description: 'The subcontractor has been notified and can now leave a review.' })
      if (targetBid) {
        setReviewTarget({
          id: targetBid.subcontractor.id,
          name: targetBid.subcontractor.name,
          company: targetBid.subcontractor.company,
          avatarUrl: targetBid.subcontractor.avatarUrl,
        })
        setReviewOpen(true)
      }
      load()
    } catch (e) {
      toast({ title: 'Failed to mark complete', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setCompleting(false)
    }
  }

  const withdrawBid = async (bidId: string) => {
    setWithdrawingId(bidId)
    try {
      await api(`/api/bids/${bidId}/withdraw`, { method: 'POST' })
      toast({ title: 'Bid withdrawn', description: 'The contractor has been notified.' })
      load()
    } catch (e) {
      toast({ title: 'Failed to withdraw bid', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setWithdrawingId(null)
    }
  }

  const cancelJob = async () => {
    if (!job) return
    setCancelling(true)
    try {
      await api(`/api/jobs/${job.id}`, { method: 'PATCH', body: { status: 'CANCELLED' } })
      toast({ title: 'Job cancelled', description: 'All bidding subcontractors have been notified.' })
      load()
    } catch (e) {
      toast({ title: 'Failed to cancel job', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setCancelling(false)
    }
  }

  const reopenJob = async () => {
    if (!job) return
    setReopening(true)
    try {
      await api(`/api/jobs/${job.id}`, { method: 'PATCH', body: { status: 'REOPEN' } })
      toast({ title: 'Job reopened', description: 'Your job is open for bids again.' })
      load()
    } catch (e) {
      toast({ title: 'Failed to reopen job', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setReopening(false)
    }
  }

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (!job) return <Card className="p-12 text-center"><p>Job not found.</p><Button className="mt-4" onClick={() => setView('directory')}>Back to marketplace</Button></Card>

  const isOwner = user?.id === job.contractorId
  const isSub = user?.role === 'SUBCONTRACTOR'
  const hasBid = job.bids.some((b) => b.subcontractorId === user?.id)
  const acceptedBid = job.bids.find((b) => b.status === 'ACCEPTED') || null
  const reviewTargetId = isOwner ? (acceptedBid?.subcontractorId ?? null) : (isSub ? job.contractorId : null)
  const pendingBidsCount = job.bids.filter((b) => b.status === 'PENDING').length
  const isAssignedSub = isSub && !!acceptedBid && acceptedBid.subcontractorId === user?.id
  const isMilestoneRelevant = job.status === 'ASSIGNED' || job.status === 'COMPLETED'
  const showMilestones = isMilestoneRelevant && (isOwner || isAssignedSub)

  return (
    <div className="space-y-5">
      <button onClick={() => setView('directory')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </button>

      {/* Job completion banner for assigned jobs (contractor view) */}
      {isOwner && job.status === 'ASSIGNED' && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 p-5 animate-slide-in-up">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-emerald-700 dark:text-emerald-400">Job in progress</p>
                <p className="text-sm text-muted-foreground">
                  {job.assignedToId ? 'A subcontractor has been assigned. Mark the job complete when work is finished so they can leave a review.' : 'Waiting for assignment.'}
                </p>
              </div>
            </div>
            <Button onClick={markComplete} disabled={completing} className="bg-emerald-600 hover:bg-emerald-700">
              {completing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              Mark as complete
            </Button>
          </div>
        </Card>
      )}

      {/* Completed banner */}
      {job.status === 'COMPLETED' && (
        <Card className="border-primary/30 bg-primary/5 p-5 animate-slide-in-up">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <Check className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-primary">Job completed 🎉</p>
                <p className="text-sm text-muted-foreground">This job has been marked complete. Both parties can now leave a review on the other's profile.</p>
              </div>
            </div>
            {reviewTargetId && (
              <Button
                onClick={() => openProfile(reviewTargetId)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Star className="mr-1.5 h-4 w-4 fill-current" /> Leave a review
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Cancelled banner */}
      {job.status === 'CANCELLED' && (
        <Card className="border-rose-500/30 bg-rose-500/5 p-5 animate-slide-in-up">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                <XCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-rose-700 dark:text-rose-400">Job cancelled</p>
                <p className="text-sm text-muted-foreground">
                  This job has been cancelled and is no longer accepting bids. All bidding subcontractors have been notified.
                </p>
              </div>
            </div>
            {isOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={reopening} className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10">
                    {reopening ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-1.5 h-4 w-4" />}
                    Reopen job
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reopen this job?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The job will return to Open status and accept new bids. Previously submitted bids will remain on the job.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={reopenJob}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Reopen job
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-5 lg:col-span-2">
          <Card className="overflow-hidden">
            {/* ── Status Stepper ── */}
            <div className="border-b border-border bg-gradient-to-r from-muted/40 via-muted/20 to-transparent px-6 py-5">
              <div className="flex items-center justify-center">
                <StatusStepper status={job.status} />
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <TradeBadge trade={job.trade} />
                  <Badge variant="outline">{job.category}</Badge>
                  <UrgencyBadge urgency={job.urgency} />
                  <StatusBadge status={job.status} />
                </div>
                {isOwner && (job.status === 'OPEN' || job.status === 'ASSIGNED') && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={cancelling} className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10">
                        {cancelling ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
                        Cancel job
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                          Cancel this job?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          All subcontractors with pending bids will be notified. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep job open</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={cancelJob}
                          className="bg-rose-600 text-white hover:bg-rose-700"
                        >
                          Yes, cancel job
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{job.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Posted {timeAgo(job.createdAt)}</p>

              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Info icon={DollarSign} label="Budget"><span className="font-bold">{formatMoney(job.budgetMin)}–{formatMoney(job.budgetMax)}</span></Info>
                <Info icon={MapPin} label="Location"><span>{job.city ? `${job.city}, ${job.state}` : job.location}</span></Info>
                <Info icon={Clock} label="Duration"><span>{job.duration}</span></Info>
                <Info icon={Users} label="Crew size"><span>{job.crewSize} {job.crewSize === 1 ? 'person' : 'people'}</span></Info>
              </div>

              {/* ── Budget Range Bar ── */}
              {job.bids.length > 0 && (
                <div className="mt-5 rounded-lg border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bid positions within budget</p>
                  <BudgetRangeBar budgetMin={job.budgetMin} budgetMax={job.budgetMax} bids={job.bids.map((b) => ({ amount: b.amount, status: b.status }))} />
                </div>
              )}

              <div className="mt-6">
                <h3 className="flex items-center gap-2 font-bold"><FileText className="h-4 w-4 text-primary" /> Job description</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{job.description}</p>
              </div>
            </div>
          </Card>

          {/* Bids */}
          <Card className="overflow-hidden">
            <div className="border-b border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">Bids ({job.bids.length})</h3>
                  <p className="text-xs text-muted-foreground">{job.bids.length === 0 ? 'No bids yet — be the first!' : 'Sorted by lowest amount'}</p>
                </div>
                {isOwner && pendingBidsCount >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCompareOpen(true)}
                    className="shrink-0 gap-1.5 border-amber-500/40 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
                  >
                    <GitCompare className="h-4 w-4" /> Compare bids
                  </Button>
                )}
              </div>
            </div>

            {/* Assigned crew highlight */}
            {(job.status === 'ASSIGNED' || job.status === 'COMPLETED') && acceptedBid && (
              <div className="border-b border-border bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent p-5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  <HardHat className="h-3.5 w-3.5" />
                  Assigned crew
                </div>
                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <button onClick={() => openProfile(acceptedBid.subcontractor.id)} className="flex items-center gap-3 text-left">
                    <UserAvatar user={acceptedBid.subcontractor} className="h-12 w-12 ring-2 ring-primary/40" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold hover:underline">{acceptedBid.subcontractor.name}</p>
                        {acceptedBid.subcontractor.verified && <VerifiedBadge className="px-1.5 py-0" />}
                        <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/15">
                          <CheckCircle2 className="h-3 w-3" /> Hired
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {acceptedBid.subcontractor.trade} · {acceptedBid.subcontractor.city}, {acceptedBid.subcontractor.state}
                      </p>
                      <Rating value={acceptedBid.subcontractor.rating} count={acceptedBid.subcontractor.reviewCount} className="mt-0.5" />
                    </div>
                  </button>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-primary">{formatMoney(acceptedBid.amount)}</p>
                      <p className="text-xs text-muted-foreground">{acceptedBid.duration}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={messageAssignedSub}>
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Message
                    </Button>
                    {isOwner && job.status === 'COMPLETED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          openReviewFor({
                            id: acceptedBid.subcontractor.id,
                            name: acceptedBid.subcontractor.name,
                            company: acceptedBid.subcontractor.company,
                            avatarUrl: acceptedBid.subcontractor.avatarUrl,
                          })
                        }
                        className="gap-1.5 border-amber-500/40 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
                      >
                        <Star className="h-3.5 w-3.5" /> Leave a review
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="divide-y divide-border">
              {job.bids.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">No bids submitted yet.</div>
              )}
              {job.bids.map((bid) => {
                const isAcceptedCompleted = bid.status === 'ACCEPTED' && job.status === 'COMPLETED'
                const isOwnBid = bid.subcontractorId === user?.id
                const tradeAccent = getTradeAccent(bid.subcontractor.trade)
                return (
                <div
                  key={bid.id}
                  className={cn(
                    'group border-l-4 p-5 transition-all duration-200',
                    tradeAccent,
                    'hover:bg-muted/40 hover:shadow-md'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button onClick={() => openProfile(bid.subcontractor.id)} className="transition-transform hover:scale-105">
                      <UserAvatar user={bid.subcontractor} className="h-11 w-11 ring-1 ring-transparent group-hover:ring-primary/30 transition-all" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => openProfile(bid.subcontractor.id)} className="font-bold hover:underline">{bid.subcontractor.name}</button>
                        {bid.subcontractor.verified && <VerifiedBadge className="px-1.5 py-0" />}
                        {isOwnBid && (
                          <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-primary">
                            You
                          </Badge>
                        )}
                        {isAcceptedCompleted ? (
                          <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">
                            <Star className="h-3 w-3 fill-current" /> Accepted
                          </Badge>
                        ) : (
                          <StatusBadge status={bid.status} />
                        )}
                        {isAcceptedCompleted && (
                          <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/15">
                            <CheckCircle2 className="h-3 w-3" /> Hired
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{bid.subcontractor.trade} · {bid.subcontractor.city}, {bid.subcontractor.state}</p>
                      <Rating value={bid.subcontractor.rating} count={bid.subcontractor.reviewCount} className="mt-1" />
                      <p className="mt-2 text-sm">{bid.message}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Placed {timeAgo(bid.createdAt)}</span>
                        <span>· {bid.subcontractor.jobsCompleted} jobs completed</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-extrabold text-primary">{formatMoney(bid.amount)}</p>
                      <p className="text-xs text-muted-foreground">{bid.duration}</p>
                    </div>
                  </div>
                  {isOwner && bid.status === 'PENDING' && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => acceptBid(bid.id)} disabled={accepting === bid.id}>
                        {accepting === bid.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Accept bid
                      </Button>
                    </div>
                  )}
                  {isOwnBid && bid.status === 'PENDING' && (
                    <div className="mt-3 flex justify-end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={withdrawingId === bid.id} className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10">
                            {withdrawingId === bid.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                            Withdraw bid
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                              Withdraw your bid?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              The contractor will be notified. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep bid</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => withdrawBid(bid.id)}
                              className="bg-rose-600 text-white hover:bg-rose-700"
                            >
                              Withdraw bid
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
                )
              })}
            </div>
          </Card>

          {/* ── Milestone Tracker ── */}
          {showMilestones && (
            <section className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
              <div className="h-1.5 w-full rounded-t-lg bg-gradient-to-r from-primary to-amber-400" />
              <MilestoneTracker jobId={job.id} isOwner={isOwner} jobStatus={job.status} />
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* ── Contractor card (enhanced) ── */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent px-5 pt-5 pb-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Posted by</h3>
            </div>
            <div className="px-5 pb-5">
              <button onClick={() => openProfile(job.contractor.id)} className="mt-2 flex w-full items-center gap-3 text-left group/contractor">
                <UserAvatar user={job.contractor} className="h-14 w-14 ring-2 ring-amber-500/30 group-hover/contractor:ring-amber-500/60 transition-all" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-bold text-base group-hover/contractor:underline">{job.contractor.name}</p>
                    {job.contractor.verified && <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{job.contractor.company}</p>
                  <Rating value={job.contractor.rating} count={job.contractor.reviewCount} className="mt-1" />
                </div>
              </button>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/20 p-3 text-center">
                <div>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{job.contractor.jobsCompleted}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Jobs posted</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{job.contractor.city || '—'}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Location</p>
                </div>
              </div>
              {!isOwner && (
                <Button variant="outline" className="mt-4 w-full border-amber-500/30 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-300" onClick={messageContractor}>
                  <MessageSquare className="mr-1.5 h-4 w-4" /> Message contractor
                </Button>
              )}
              {isAssignedSub && job.status === 'COMPLETED' && (
                <Button
                  variant="outline"
                  onClick={() =>
                    openReviewFor({
                      id: job.contractor.id,
                      name: job.contractor.name,
                      company: job.contractor.company,
                      avatarUrl: job.contractor.avatarUrl,
                    })
                  }
                  className="mt-3 w-full gap-1.5 border-amber-500/40 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
                >
                  <Star className="h-4 w-4" /> Leave a review
                </Button>
              )}
            </div>
          </Card>

          {/* Bid form (subcontractors only) */}
          {!isOwner && job.status === 'OPEN' && (
            <Card className="p-5">
              <h3 className="font-bold">{hasBid ? 'Your bid' : 'Submit a bid'}</h3>
              {hasBid ? (
                <div className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-sm">
                  <p className="flex items-center gap-1.5 font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Bid submitted</p>
                  <p className="mt-1 text-xs text-muted-foreground">You&apos;ll be notified when the contractor responds.</p>
                </div>
              ) : isSub ? (
                <div className="mt-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Your bid amount (USD)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="number" placeholder="36000" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className="pl-9" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Budget range: {formatMoneyFull(job.budgetMin)} – {formatMoneyFull(job.budgetMax)}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Estimated duration</Label>
                    <Input placeholder="e.g. 4 weeks" value={bidDuration} onChange={(e) => setBidDuration(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Message to contractor</Label>
                    <Textarea placeholder="Introduce your crew, relevant experience, and why you're the right fit." value={bidMessage} onChange={(e) => setBidMessage(e.target.value)} rows={4} />
                  </div>
                  <Button className="w-full" onClick={submitBid} disabled={bidding}>
                    {bidding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-1.5 h-4 w-4" /> Submit bid</>}
                  </Button>
                </div>
              ) : !user ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-muted-foreground">Sign up as a subcontractor to bid on this job.</p>
                  <Button className="w-full" onClick={() => openAuth('signup')}>Sign up to bid</Button>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Only subcontractor accounts can bid on jobs.</p>
              )}
            </Card>
          )}

          {/* Job summary */}
          <Card className="p-5">
            <h3 className="font-bold">Job summary</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Trade" value={job.trade} />
              <Row label="Category" value={job.category} />
              <Row label="Budget" value={`${formatMoneyFull(job.budgetMin)} – ${formatMoneyFull(job.budgetMax)}`} />
              <Row label="Urgency" value={<UrgencyBadge urgency={job.urgency} />} />
              <Row label="Crew size" value={`${job.crewSize}`} />
              <Row label="Status" value={<StatusBadge status={job.status} />} />
            </dl>
          </Card>
        </div>
      </div>

      {/* ── Bid Comparison Dialog ── */}
      <BidComparisonDialog
        bids={job.bids}
        budgetMin={job.budgetMin}
        budgetMax={job.budgetMax}
        open={compareOpen}
        onOpenChange={setCompareOpen}
        onAccept={handleCompareAccept}
      />

      {/* ── Review Dialog ── */}
      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        targetUser={reviewTarget}
        jobId={job.id}
        jobTitle={job.title}
        onSubmitted={load}
      />
    </div>
  )
}

/* ──────────────────── Helper Components ──────────────────── */

function Info({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground"><Icon className="h-3 w-3" /> {label}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
