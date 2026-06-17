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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'CONTRACTOR') {
    return NextResponse.json({ error: 'Only contractors can manage milestones' }, { status: 403 })
  }

  const milestone = await db.milestone.findUnique({
    where: { id },
    include: { job: { select: { contractorId: true } } },
  })
  if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  if (milestone.job.contractorId !== session.userId) {
    return NextResponse.json({ error: 'Only the job owner can modify milestones' }, { status: 403 })
  }

  const body = await req.json()
  const data: {
    title?: string
    description?: string | null
    dueOffset?: number
    order?: number
    completed?: boolean
    completedAt?: Date | null
  } = {}

  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim()
  if (typeof body.description === 'string') {
    data.description = body.description.trim() ? body.description.trim() : null
  }
  if (typeof body.dueOffset === 'number') data.dueOffset = Math.max(0, Math.floor(body.dueOffset))
  if (typeof body.order === 'number') data.order = Math.floor(body.order)

  if (typeof body.completed === 'boolean') {
    data.completed = body.completed
    data.completedAt = body.completed ? new Date() : null
  }

  const updated = await db.milestone.update({ where: { id }, data })
  return NextResponse.json({ milestone: serialize(updated) })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'CONTRACTOR') {
    return NextResponse.json({ error: 'Only contractors can manage milestones' }, { status: 403 })
  }

  const milestone = await db.milestone.findUnique({
    where: { id },
    include: { job: { select: { contractorId: true } } },
  })
  if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  if (milestone.job.contractorId !== session.userId) {
    return NextResponse.json({ error: 'Only the job owner can delete milestones' }, { status: 403 })
  }

  await db.milestone.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
