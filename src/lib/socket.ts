import { io, type Socket } from 'socket.io-client'

/**
 * Typed singleton socket.io-client for CrewUp real-time messaging.
 *
 * Connects via the Caddy gateway using the `XTransformPort=3003` query,
 * which routes the request to the chat-service mini-service.
 *
 * This module is only imported by client components — no `'use client'`
 * directive is needed (and shouldn't be added: this is a plain module
 * that gets bundled into the client when imported).
 */

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      // Caddy gateway routes via XTransformPort query → port 3003
      query: { XTransformPort: '3003' },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
    })
  }
  return socket
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
