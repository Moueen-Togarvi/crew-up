import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { messageSchema } from '@/lib/validations'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const convo = await db.conversation.findUnique({
    where: { id },
    include: { userA: true, userB: true, messages: { orderBy: { createdAt: 'asc' } } },
  })
  if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (convo.userAId !== session.userId && convo.userBId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // mark messages from the other user as read
  await db.message.updateMany({
    where: { conversationId: id, senderId: { not: session.userId }, read: false },
    data: { read: true },
  })
  return NextResponse.json({
    conversation: {
      id: convo.id,
      jobId: convo.jobId,
      messages: convo.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    },
  })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const convo = await db.conversation.findUnique({ where: { id } })
  if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (convo.userAId !== session.userId && convo.userBId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const raw = await req.json()
  const parsed = messageSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
  }
  const body = parsed.data.body
  const message = await db.message.create({
    data: { conversationId: id, senderId: session.userId, body },
  })
  await db.conversation.update({ where: { id }, data: { updatedAt: new Date() } })

  // Notify the other participant of the new message (best-effort)
  const recipientId = convo.userAId === session.userId ? convo.userBId : convo.userAId
  const sender = await db.user.findUnique({ where: { id: session.userId }, select: { name: true } })
  await notify({
    userId: recipientId,
    type: 'NEW_MESSAGE',
    title: `New message from ${sender?.name || 'someone'}`,
    body: body.length > 80 ? body.slice(0, 80) + '…' : body,
    link: id,
  })

  // Real-time broadcast via the chat-service (socket.io mini-service on port 3003).
  // Fire-and-forget — never let a relay failure break message creation.
  try {
    await fetch('http://localhost:3003/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SECRET,
      },
      body: JSON.stringify({
        event: 'message',
        payload: {
          conversationId: id,
          recipientId,
          message: {
            id: message.id,
            senderId: message.senderId,
            body: message.body,
            createdAt: message.createdAt.toISOString(),
            read: message.read,
          },
        },
      }),
    })
  } catch {
    // best-effort: socket relay is non-critical
  }

  return NextResponse.json({ message: { ...message, createdAt: message.createdAt.toISOString() } })
}
