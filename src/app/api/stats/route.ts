import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const [jobs, subcontractors, contractors, bids] = await Promise.all([
    db.job.count(),
    db.user.count({ where: { role: 'SUBCONTRACTOR' } }),
    db.user.count({ where: { role: 'CONTRACTOR' } }),
    db.bid.count(),
  ])
  return NextResponse.json({ jobs, subcontractors, contractors, bids })
}
