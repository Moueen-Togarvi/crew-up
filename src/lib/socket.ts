import { io, type Socket } from 'socket.io-client'

/**
 * Typed singleton socket.io-client for BuildUp real-time messaging.
 *
 * Connects via the Caddy gateway using the `XTransformPort=3003` query,
 * which routes the request to the chat-service mini-service.
 *
 * The session JWT is read from the httpOnly cookie and sent as part of the
 * handshake `auth` payload so the chat-service can verify the user.
 */

let socket: Socket | null = null

function getSessionTokenFromCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(/(?:^|;\s*)buildup_session=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : undefined
}

export function getSocket(): Socket {
  if (!socket) {
    const token = getSessionTokenFromCookie()
    socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      // Caddy gateway routes via XTransformPort query → port 3003
      query: { XTransformPort: '3003' },
      // Pass auth token for server-side verification
      auth: token ? { token } : undefined,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

/** Re-create the socket with a fresh token (e.g. after login/signup). */
export function resetSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// ---- Typed event payloads (shared between client & server contracts) ----

export interface ServerMessagePayload {
  conversationId: string
  recipientId: string
  message: {
    id: string
    senderId: string
    body: string
    createdAt: string
    read: boolean
  }
}

export interface TypingEventPayload {
  conversationId: string
  userId: string
  name?: string
}

export interface StopTypingEventPayload {
  conversationId: string
  userId: string
}

export interface JoinEventPayload {
  userId: string
}
