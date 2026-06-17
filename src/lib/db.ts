import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const cached = globalForPrisma.prisma
const isStale =
  cached !== undefined &&
  (typeof (cached as unknown as { milestone?: unknown }).milestone === 'undefined' ||
   typeof (cached as unknown as { crewMember?: unknown }).crewMember === 'undefined')

if (isStale) {
  console.log('[db] discarding stale PrismaClient — recreating with current schema')
  globalForPrisma.prisma = undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
