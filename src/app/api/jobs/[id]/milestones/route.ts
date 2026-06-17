import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

function serialize(m: {
  id: string
  jobId: string
  title: string
  description: string | null
  dueOffset: number
  completed: boolean
  completedAt: Date | null
  order: number
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: m.id,
    jobId: m.jobId,
    title: m.title,
    description: m.description,
    dueOffset: m.dueOffset,
    completed: m.completed,
    completedAt: m.completedAt ? m.completedAt.toISOString() : null,
    order: m.order,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  console.log('[milestones GET] has milestone?', typeof (db as unknown as { milestone?: unknown }).milestone)
  const milestones = await db.milestone.findMany({
    where: { jobId: id },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json({ milestones: milestones.map(serialize) })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'CONTRACTOR') {
    return NextResponse.json({ error: 'Only contractors can manage milestones' }, { status: 403 })
  }
  const job = await db.job.findUnique({ where: { id } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.contractorId !== session.userId) {
    return NextResponse.json({ error: 'Only the job owner can add milestones' }, { status: 403 })
  }

  const body = await req.json()
  const { title, description, dueOffset, order } = body ?? {}
  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // If no explicit order provided, append after the highest existing order
  let nextOrder = typeof order === 'number' ? order : 0
  if (typeof order !== 'number') {
    const last = await db.milestone.findFirst({
      where: { jobId: id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    nextOrder = last ? last.order + 1 : 0
  }

  const milestone = await db.milestone.create({
    data: {
      jobId: id,
      title: title.trim(),
      description: typeof description === 'string' && description.trim() ? description.trim() : null,
      dueOffset: typeof dueOffset === 'number' ? Math.max(0, Math.floor(dueOffset)) : 0,
      order: nextOrder,
    },
  })

  return NextResponse.json({ milestone: serialize(milestone) }, { status: 201 })
}
