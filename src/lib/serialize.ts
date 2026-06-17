import type { User } from '@prisma/client'
import type { PublicUser } from './constants'

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as 'CONTRACTOR' | 'SUBCONTRACTOR',
    company: u.company,
    phone: u.phone,
    city: u.city,
    state: u.state,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    trade: u.trade,
    skills: u.skills,
    hourlyRate: u.hourlyRate,
    rating: u.rating,
    reviewCount: u.reviewCount,
    jobsCompleted: u.jobsCompleted,
    verified: u.verified,
    plan: u.plan,
    createdAt: u.createdAt.toISOString(),
  }
}
