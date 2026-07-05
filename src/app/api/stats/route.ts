import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [jobs, subcontractors, contractors, bids] = await Promise.all([
    db.job.count(),
    db.user.count({ where: { role: 'SUBCONTRACTOR' } }),
    db.user.count({ where: { role: 'CONTRACTOR' } }),
    db.bid.count(),
  ])
  return NextResponse.json({ jobs, subcontractors, contractors, bids })
}
