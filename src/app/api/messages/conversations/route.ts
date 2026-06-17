import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { toPublicUser } from '@/lib/serialize'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ conversations: [] })
  const convos = await db.conversation.findMany({
    where: { OR: [{ userAId: session.userId }, { userBId: session.userId }] },
    include: {
      userA: true,
      userB: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  })
  const result = convos.map((c) => {
    const other = c.userAId === session.userId ? c.userB : c.userA
    const lastMsg = c.messages[0]
    return {
      id: c.id,
      jobId: c.jobId,
      other: toPublicUser(other),
      lastMessage: lastMsg ? { body: lastMsg.body, createdAt: lastMsg.createdAt.toISOString(), senderId: lastMsg.senderId } : null,
      updatedAt: c.updatedAt.toISOString(),
    }
  })
  return NextResponse.json({ conversations: result })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { targetUserId, jobId, body } = await req.json()
  if (!targetUserId || !body) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (targetUserId === session.userId) return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })

  // find or create conversation
  let convo = await db.conversation.findFirst({
    where: {
      OR: [
        { userAId: session.userId, userBId: targetUserId },
        { userAId: targetUserId, userBId: session.userId },
      ],
    },
  })
  if (!convo) {
    convo = await db.conversation.create({
      data: {
        userAId: session.userId,
        userBId: targetUserId,
        jobId: jobId || null,
      },
    })
  }
  const message = await db.message.create({
    data: { conversationId: convo.id, senderId: session.userId, body },
  })
  await db.conversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } })
  return NextResponse.json({ conversationId: convo.id, message: { ...message, createdAt: message.createdAt.toISOString() } })
}
