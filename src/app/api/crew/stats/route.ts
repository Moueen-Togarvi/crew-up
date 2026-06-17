import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/crew/stats — aggregate stats for the current user's crew
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const members = await db.crewMember.findMany({
    where: { ownerUserId: session.userId },
    select: { role: true, status: true, hourlyRate: true },
  })

  const total = members.length
  let active = 0
  let onJob = 0
  let unavailable = 0
  let rateSum = 0
  let rateCount = 0
  const byRole: Record<string, number> = {}

  for (const m of members) {
    if (m.status === 'ACTIVE') active += 1
    else if (m.status === 'ON_JOB') onJob += 1
    else if (m.status === 'UNAVAILABLE') unavailable += 1

    if (m.hourlyRate != null && !Number.isNaN(m.hourlyRate)) {
      rateSum += m.hourlyRate
      rateCount += 1
    }

    const r = m.role || 'Other'
    byRole[r] = (byRole[r] || 0) + 1
  }

  const avgRate = rateCount > 0 ? Math.round((rateSum / rateCount) * 100) / 100 : 0

  return NextResponse.json({
    total,
    active,
    onJob,
    unavailable,
    avgRate,
    byRole,
  })
}
