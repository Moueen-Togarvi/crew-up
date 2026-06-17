'use client'

import { useEffect, useState, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import type { JobWithRelations, BidWithUser } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { TradeBadge, StatusBadge, UrgencyBadge } from '@/components/crewup/shared/badges'
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { formatMoney, timeAgo } from '@/components/crewup/shared/format'
import { useToast } from '@/hooks/use-toast'
import { Briefcase, FilePlus2, MapPin, Clock, Users, DollarSign, Loader2, TrendingUp, Trash2, AlertTriangle } from 'lucide-react'

export function MarketplaceView() {
  const user = useApp((s) => s.user)!
  const setView = useApp((s) => s.setView)
  const openJob = useApp((s) => s.openJob)
  const openProfile = useApp((s) => s.openProfile)
  const { toast } = useToast()
  const [jobs, setJobs] = useState<JobWithRelations[]>([])
  const [bids, setBids] = useState<(BidWithUser & { job?: JobWithRelations })[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { jobs } = await api<{ jobs: JobWithRelations[] }>('/api/jobs')
      if (user.role === 'CONTRACTOR') {
        setJobs(jobs.filter((j) => j.contractorId === user.id))
      } else {
        const myBids = jobs.flatMap((j) => j.bids.filter((b) => b.subcontractorId === user.id).map((b) => ({ ...b, job: j })))
        setBids(myBids)
      }
    } finally {
      setLoading(false)
    }
  }, [user.id, user.role])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        await load()
      } catch {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [load])

  const withdrawBid = async (bidId: string) => {
    setWithdrawingId(bidId)
    try {
      await api(`/api/bids/${bidId}/withdraw`, { method: 'POST' })
      toast({ title: 'Bid withdrawn', description: 'The contractor has been notified.' })
      await load()
    } catch (e) {
      toast({ title: 'Failed to withdraw bid', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setWithdrawingId(null)
    }
  }

  const isContractor = user.role === 'CONTRACTOR'
  const filtered = isContractor
    ? tab === 'all' ? jobs : jobs.filter((j) => j.status === tab)
    : tab === 'all' ? bids : bids.filter((b) => b.status === tab)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{isContractor ? 'My jobs' : 'My bids'}</h1>
          <p className="text-sm text-muted-foreground">{isContractor ? 'Manage jobs you\'ve posted.' : 'Track the bids you\'ve submitted.'}</p>
        </div>
        {isContractor && (
          <Button onClick={() => setView('post-job')}><FilePlus2 className="mr-1.5 h-4 w-4" /> Post a job</Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {isContractor ? (
            <>
              <TabsTrigger value="OPEN">Open</TabsTrigger>
              <TabsTrigger value="ASSIGNED">Assigned</TabsTrigger>
              <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="PENDING">Pending</TabsTrigger>
              <TabsTrigger value="ACCEPTED">Accepted</TabsTrigger>
              <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
            </>
          )}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          {isContractor ? <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/40" /> : <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground/40" />}
          <p className="mt-4 font-semibold">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">{isContractor ? 'Post your first job to get started.' : 'Browse the marketplace and submit a bid.'}</p>
          <Button className="mt-4" onClick={() => setView(isContractor ? 'post-job' : 'directory')}>
            {isContractor ? 'Post a job' : 'Find work'}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {isContractor
            ? (filtered as JobWithRelations[]).map((job) => (
                <Card key={job.id} className="cursor-pointer p-5 transition-all hover:border-primary/30 hover:shadow-md" onClick={() => openJob(job.id)}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <TradeBadge trade={job.trade} />
                        <StatusBadge status={job.status} />
                        <UrgencyBadge urgency={job.urgency} />
                      </div>
                      <h3 className="mt-2 font-bold">{job.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {formatMoney(job.budgetMin)}–{formatMoney(job.budgetMax)}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.city || job.location}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {job.duration}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {job.crewSize}</span>
                        <span>· {timeAgo(job.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary">{job._count?.bids ?? job.bids.length} bid{(job._count?.bids ?? job.bids.length) === 1 ? '' : 's'}</Badge>
                      <Button size="sm" variant="outline">View</Button>
                    </div>
                  </div>
                </Card>
              ))
            : (filtered as (BidWithUser & { job?: JobWithRelations })[]).map((bid) => (
                <Card key={bid.id} className="cursor-pointer p-5 transition-all hover:border-primary/30 hover:shadow-md" onClick={() => bid.job && openJob(bid.job.id)}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {bid.job && <TradeBadge trade={bid.job.trade} />}
                        <StatusBadge status={bid.status} />
                      </div>
                      <h3 className="mt-2 font-bold">{bid.job?.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Your bid: <span className="font-semibold text-foreground">{formatMoney(bid.amount)}</span></span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {bid.duration}</span>
                        <span>· placed {timeAgo(bid.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); if (bid.job) openProfile(bid.job.contractor.id) }} className="flex items-center gap-1.5 text-xs hover:underline">
                        <UserAvatar user={bid.job?.contractor || { name: '' }} className="h-6 w-6" />
                        <span className="font-medium">{bid.job?.contractor.company || bid.job?.contractor.name}</span>
                      </button>
                      {bid.status === 'PENDING' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={withdrawingId === bid.id}
                              onClick={(e) => e.stopPropagation()}
                              className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10"
                            >
                              {withdrawingId === bid.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              <span className="ml-1.5 hidden sm:inline">Withdraw</span>
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
                      )}
                    </div>
                  </div>
                </Card>
              ))}
        </div>
      )}
    </div>
  )
}
