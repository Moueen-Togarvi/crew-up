import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export type ActivityType =
  | 'JOB_POSTED'
  | 'BID_PLACED'
  | 'JOB_COMPLETED'
  | 'REVIEW_LEFT'
  | 'USER_JOINED'

export interface ActivityItem {
  id: string
  type: ActivityType
  actorId: string
  actorName: string
  actorRole: 'CONTRACTOR' | 'SUBCONTRACTOR'
  actorAvatarUrl: string | null
  targetId: string | null
  targetName: string | null
  targetTrade: string | null
  amount: number | null
  rating: number | null
  createdAt: string
}

const LIMIT_PER_TYPE = 50
const FINAL_LIMIT = 40

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Each source is fetched independently and fails safe to [] so a single
  // broken table/query never takes down the whole feed.
  const [jobPosted, bidPlaced, jobCompleted, reviewLeft, userJoined] =
    await Promise.all([
      (async (): Promise<ActivityItem[]> => {
        try {
          const jobs = await db.job.findMany({
            where: { status: 'OPEN' },
            orderBy: { createdAt: 'desc' },
            take: LIMIT_PER_TYPE,
            include: { contractor: true },
          })
          return jobs.map((j) => ({
            id: `JOB_POSTED:${j.id}`,
            type: 'JOB_POSTED' as const,
            actorId: j.contractor?.id ?? j.contractorId,
            actorName: j.contractor?.name ?? 'Someone',
            actorRole: (j.contractor?.role === 'SUBCONTRACTOR'
              ? 'SUBCONTRACTOR'
              : 'CONTRACTOR') as 'CONTRACTOR' | 'SUBCONTRACTOR',
            actorAvatarUrl: j.contractor?.avatarUrl ?? null,
            targetId: j.id,
            targetName: j.title,
            targetTrade: j.trade,
            amount: null,
            rating: null,
            createdAt: j.createdAt.toISOString(),
          }))
        } catch {
          return []
        }
      })(),
      (async (): Promise<ActivityItem[]> => {
        try {
          const bids = await db.bid.findMany({
            orderBy: { createdAt: 'desc' },
            take: LIMIT_PER_TYPE,
            include: {
              subcontractor: true,
              job: { include: { contractor: true } },
            },
          })
          return bids.map((b) => ({
            id: `BID_PLACED:${b.id}`,
            type: 'BID_PLACED' as const,
            actorId: b.subcontractor?.id ?? b.subcontractorId,
            actorName: b.subcontractor?.name ?? 'Someone',
            actorRole: (b.subcontractor?.role === 'CONTRACTOR'
              ? 'CONTRACTOR'
              : 'SUBCONTRACTOR') as 'CONTRACTOR' | 'SUBCONTRACTOR',
            actorAvatarUrl: b.subcontractor?.avatarUrl ?? null,
            targetId: b.job?.id ?? b.jobId,
            targetName: b.job?.title ?? null,
            targetTrade: b.job?.trade ?? null,
            amount: b.amount,
            rating: null,
            createdAt: b.createdAt.toISOString(),
          }))
        } catch {
          return []
        }
      })(),
      (async (): Promise<ActivityItem[]> => {
        try {
          const jobs = await db.job.findMany({
            where: { status: 'COMPLETED' },
            orderBy: { updatedAt: 'desc' },
            take: LIMIT_PER_TYPE,
            include: {
              contractor: true,
              bids: {
                where: { status: 'ACCEPTED' },
                take: 1,
                include: { subcontractor: true },
              },
            },
          })
          return jobs.map((j) => {
            const acceptedSub = j.bids[0]?.subcontractor
            const isSubActor = !!acceptedSub
            return {
              id: `JOB_COMPLETED:${j.id}`,
              type: 'JOB_COMPLETED' as const,
              actorId: isSubActor
                ? acceptedSub!.id
                : j.contractor?.id ?? j.contractorId,
              actorName: isSubActor
                ? acceptedSub!.name
                : j.contractor?.name ?? 'Someone',
              actorRole: (isSubActor
                ? 'SUBCONTRACTOR'
                : 'CONTRACTOR') as 'CONTRACTOR' | 'SUBCONTRACTOR',
              actorAvatarUrl: isSubActor
                ? acceptedSub!.avatarUrl ?? null
                : j.contractor?.avatarUrl ?? null,
              targetId: j.id,
              targetName: j.title,
              targetTrade: j.trade,
              amount: null,
              rating: null,
              createdAt: j.updatedAt.toISOString(),
            }
          })
        } catch {
          return []
        }
      })(),
      (async (): Promise<ActivityItem[]> => {
        try {
          const reviews = await db.review.findMany({
            orderBy: { createdAt: 'desc' },
            take: LIMIT_PER_TYPE,
            include: { author: true, target: true },
          })
          return reviews.map((r) => ({
            id: `REVIEW_LEFT:${r.id}`,
            type: 'REVIEW_LEFT' as const,
            actorId: r.author?.id ?? r.authorId,
            actorName: r.author?.name ?? 'Someone',
            actorRole: (r.author?.role === 'SUBCONTRACTOR'
              ? 'SUBCONTRACTOR'
              : 'CONTRACTOR') as 'CONTRACTOR' | 'SUBCONTRACTOR',
            actorAvatarUrl: r.author?.avatarUrl ?? null,
            targetId: r.target?.id ?? r.targetId,
            targetName: r.target?.name ?? null,
            targetTrade: r.target?.trade ?? null,
            amount: null,
            rating: r.rating,
            createdAt: r.createdAt.toISOString(),
          }))
        } catch {
          return []
        }
      })(),
      (async (): Promise<ActivityItem[]> => {
        try {
          const users = await db.user.findMany({
            orderBy: { createdAt: 'desc' },
            take: LIMIT_PER_TYPE,
          })
          return users.map((u) => ({
            id: `USER_JOINED:${u.id}`,
            type: 'USER_JOINED' as const,
            actorId: u.id,
            actorName: u.name,
            actorRole: (u.role === 'SUBCONTRACTOR'
              ? 'SUBCONTRACTOR'
              : 'CONTRACTOR') as 'CONTRACTOR' | 'SUBCONTRACTOR',
            actorAvatarUrl: u.avatarUrl ?? null,
            targetId: null,
            targetName: null,
            targetTrade: u.trade ?? null,
            amount: null,
            rating: null,
            createdAt: u.createdAt.toISOString(),
          }))
        } catch {
          return []
        }
      })(),
    ])

  const all = [
    ...jobPosted,
    ...bidPlaced,
    ...jobCompleted,
    ...reviewLeft,
    ...userJoined,
  ]
  all.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const activities = all.slice(0, FINAL_LIMIT)

  return NextResponse.json({ activities })
}
