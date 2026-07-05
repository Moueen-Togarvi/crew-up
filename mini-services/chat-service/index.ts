/**
 * BuildUp chat-service — real-time messaging relay (socket.io)
 *
 * Port 3003 (hardcoded, per project convention — do NOT use env PORT).
 * Routes via Caddy gateway: client connects to `/?XTransformPort=3003`.
 *
 * Events (client → server):
 *   - `join`       { userId }              → joins room `user:<userId>`
 *   - `typing`     { conversationId, userId, name }   → broadcast to others
 *   - `stopTyping` { conversationId, userId }         → broadcast to others
 *
 * HTTP endpoint (server-to-server, from Next.js API):
 *   POST /  with header `x-internal-secret: buildup-internal`
 *   body: { event: 'message' | 'typing' | 'stopTyping', payload }
 *     - 'message':    { conversationId, recipientId, message }
 *                     → io.to('user:' + recipientId).emit('message', payload)
 *     - 'typing':     { conversationId, userId, name? }   → io.emit('typing', payload)
 *     - 'stopTyping': { conversationId, userId }          → io.emit('stopTyping', payload)
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { Server, type Socket } from 'socket.io'
import { jwtVerify, importSPKI } from 'jose'

const PORT = 3003
const INTERNAL_SECRET = process.env.INTERNAL_SECRET
if (!INTERNAL_SECRET) {
  console.error('[chat-service] INTERNAL_SECRET env var is required')
  process.exit(1)
}
const SESSION_SECRET = process.env.SESSION_SECRET
if (!SESSION_SECRET) {
  console.error('[chat-service] SESSION_SECRET env var is required for socket auth')
  process.exit(1)
}

interface JoinPayload {
  userId: string
}
interface TypingPayload {
  conversationId: string
  userId: string
  name?: string
}
interface StopTypingPayload {
  conversationId: string
  userId: string
}
interface ChatMessagePayload {
  id: string
  senderId: string
  body: string
  createdAt: string
  read: boolean
}
interface MessagePayload {
  conversationId: string
  recipientId: string
  message: ChatMessagePayload
}
type EmitEvent = 'message' | 'typing' | 'stopTyping'
interface EmitRequest {
  event: EmitEvent
  payload: MessagePayload | TypingPayload | StopTypingPayload
}

// Track socketId → userId so we can clean up rooms on disconnect.
const socketToUser = new Map<string, string>()

const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // Only handle the internal emit endpoint. Everything else falls through
  // to socket.io's own request handler (engine.io attaches itself and
  // intercepts /socket.io/ paths before this listener runs).
  if (req.method === 'POST' && req.url === '/') {
    let raw = ''
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString()
      // Guard against unbounded bodies.
      if (raw.length > 1_000_000) {
        raw = ''
        req.destroy()
      }
    })
    req.on('end', () => {
      const secret = req.headers['x-internal-secret']
      if (secret !== INTERNAL_SECRET) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Unauthorized' }))
        return
      }
      let data: EmitRequest
      try {
        data = JSON.parse(raw) as EmitRequest
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
        return
      }
      try {
        if (data.event === 'message') {
          const p = data.payload as MessagePayload
          if (p?.recipientId && p?.message) {
            io.to('user:' + p.recipientId).emit('message', p)
            console.log(`[chat-service] relayed message → room user:${p.recipientId} (convo=${p.conversationId})`)
          }
        } else if (data.event === 'typing') {
          const p = data.payload as TypingPayload
          if (p?.conversationId && p?.userId) {
            io.emit('typing', p)
          }
        } else if (data.event === 'stopTyping') {
          const p = data.payload as StopTypingPayload
          if (p?.conversationId && p?.userId) {
            io.emit('stopTyping', p)
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Unknown event' }))
          return
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      } catch (err) {
        console.error('[chat-service] emit failed:', err)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Emit failed' }))
      }
    })
    return
  }

  // Anything else (e.g. a stray GET /) — respond so health checks succeed.
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'chat-service', port: PORT }))
    return
  }

  // Fall through: respond 404 (socket.io handles its own paths before this).
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

const io = new Server(httpServer, {
  // Use the socket.io default path (/socket.io/) — client uses path: '/socket.io'.
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  // Require auth token on connection handshake
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
  },
})

// Middleware: verify JWT token before allowing socket connection
io.use(async (socket, next) => {
  try {
    const token = (socket.handshake.auth as Record<string, unknown>).token as string | undefined
    if (!token) {
      return next(new Error('Authentication required'))
    }
    const secret = new TextEncoder().encode(SESSION_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    if (!payload.userId || typeof payload.userId !== 'string') {
      return next(new Error('Invalid token payload'))
    }
    // Attach verified userId to socket data for later use
    ;(socket.data as { userId: string }).userId = payload.userId as string
    next()
  } catch {
    next(new Error('Invalid or expired token'))
  }
})

io.on('connection', (socket: Socket) => {
  const authedUserId = (socket.data as { userId?: string }).userId
  console.log(`[chat-service] connected: ${socket.id} (user=${authedUserId ?? '?'})`)

  socket.on('join', (data: JoinPayload) => {
    // Must join a room matching the authenticated user — prevent spoofing other users
    if (!data || typeof data.userId !== 'string') return
    if (data.userId !== authedUserId) {
      console.warn(`[chat-service] rejected join: socket user ${authedUserId} tried to join as ${data.userId}`)
      return
    }
    const room = 'user:' + data.userId
    void socket.join(room)
    socketToUser.set(socket.id, data.userId)
    console.log(`[chat-service] join → room ${room} (socket ${socket.id})`)
  })

  socket.on('typing', (data: TypingPayload) => {
    if (!data || !data.conversationId || !data.userId) return
    // Broadcast to everyone except the sender; clients filter by conversationId.
    socket.broadcast.emit('typing', data)
  })

  socket.on('stopTyping', (data: StopTypingPayload) => {
    if (!data || !data.conversationId || !data.userId) return
    socket.broadcast.emit('stopTyping', data)
  })

  socket.on('disconnect', (reason: string) => {
    const userId = socketToUser.get(socket.id)
    socketToUser.delete(socket.id)
    console.log(`[chat-service] disconnected: ${socket.id} (user=${userId ?? '?'} reason=${reason})`)
  })

  socket.on('error', (err: Error) => {
    console.error(`[chat-service] socket error (${socket.id}):`, err)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[chat-service] listening on port ${PORT}`)
})

// Graceful shutdown
const shutdown = (sig: string) => {
  console.log(`[chat-service] received ${sig}, shutting down…`)
  io.close(() => {
    httpServer.close(() => {
      console.log('[chat-service] closed')
      process.exit(0)
    })
  })
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
