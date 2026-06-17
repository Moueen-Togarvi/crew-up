'use client'

import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import type { PublicUser } from '@/lib/constants'
import {
  getSocket,
  type ServerMessagePayload,
  type TypingEventPayload,
  type StopTypingEventPayload,
} from '@/lib/socket'
import type { Socket } from 'socket.io-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { VerifiedBadge } from '@/components/crewup/shared/badges'
import { timeAgo } from '@/components/crewup/shared/format'
import { useToast } from '@/hooks/use-toast'
import { Send, MessageSquare, ArrowLeft, Loader2, Search, Check, CheckCheck, Smile, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConversationSummary {
  id: string
  jobId: string | null
  other: PublicUser
  lastMessage: { body: string; createdAt: string; senderId: string } | null
  updatedAt: string
}
interface ChatMessage {
  id: string
  senderId: string
  body: string
  createdAt: string
  read: boolean
}

export function MessagesView() {
  const user = useApp((s) => s.user)!
  const activeId = useApp((s) => s.activeConversationId)
  const openConversation = useApp((s) => s.openConversation)
  const { toast } = useToast()

  const [convos, setConvos] = useState<ConversationSummary[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [loadingChat, setLoadingChat] = useState(false)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [typingUser, setTypingUser] = useState<{ name: string; conversationId: string } | null>(null)
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({})
  const endRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const typingEmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadConvos = async () => {
    setLoadingList(true)
    try {
      const { conversations } = await api<{ conversations: ConversationSummary[] }>('/api/messages/conversations')
      setConvos(conversations)
      if (!activeId && conversations.length > 0) {
        openConversation(conversations[0].id)
      }
    } finally {
      setLoadingList(false)
    }
  }

  const loadChat = async (id: string) => {
    setLoadingChat(true)
    try {
      const { conversation } = await api<{ conversation: { id: string; messages: ChatMessage[] } }>(`/api/messages/conversations/${id}`)
      setMessages(conversation.messages)
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } finally {
      setLoadingChat(false)
    }
  }

  useEffect(() => { loadConvos() }, [])
  useEffect(() => {
    if (activeId) {
      loadChat(activeId)
      // Clear unread badge for the conversation we just opened.
      setUnreadMap((prev) => (prev[activeId] ? { ...prev, [activeId]: 0 } : prev))
    } else {
      setMessages([])
    }
  }, [activeId])

  // --- Real-time socket.io subscription (replaces 8s polling) ---
  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket

    // Join the user's personal room so the chat-service can target us by userId.
    socket.emit('join', { userId: user.id })

    const onMessage = (payload: ServerMessagePayload) => {
      if (!payload?.message || !payload.conversationId) return
      const msg = payload.message
      const isActive = payload.conversationId === activeId
      const fromSelf = msg.senderId === user.id

      if (isActive) {
        // Append to the open chat (dedupe by id — socket + optimistic send can overlap).
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      } else if (!fromSelf) {
        // Bump unread count for the inactive conversation.
        setUnreadMap((prev) => ({ ...prev, [payload.conversationId]: (prev[payload.conversationId] || 0) + 1 }))
      }

      // Always bump the conversation preview + move it to the top of the list.
      setConvos((prev) => {
        const idx = prev.findIndex((c) => c.id === payload.conversationId)
        if (idx === -1) return prev
        const next = [...prev]
        next[idx] = {
          ...next[idx],
          lastMessage: { body: msg.body, createdAt: msg.createdAt, senderId: msg.senderId },
          updatedAt: msg.createdAt,
        }
        const [moved] = next.splice(idx, 1)
        next.unshift(moved)
        return next
      })
    }

    const onTyping = (payload: TypingEventPayload) => {
      if (!payload || payload.userId === user.id) return // ignore our own typing echo
      if (payload.conversationId === activeId) {
        setTypingUser({ name: payload.name || 'Someone', conversationId: payload.conversationId })
        // Safety auto-clear in case the stopTyping event is missed.
        if (typingIndicatorTimerRef.current) clearTimeout(typingIndicatorTimerRef.current)
        typingIndicatorTimerRef.current = setTimeout(() => setTypingUser(null), 3500)
      }
    }

    const onStopTyping = (payload: StopTypingEventPayload) => {
      if (!payload || payload.userId === user.id) return
      if (payload.conversationId === activeId) {
        setTypingUser(null)
        if (typingIndicatorTimerRef.current) {
          clearTimeout(typingIndicatorTimerRef.current)
          typingIndicatorTimerRef.current = null
        }
      }
    }

    socket.on('message', onMessage)
    socket.on('typing', onTyping)
    socket.on('stopTyping', onStopTyping)

    return () => {
      socket.off('message', onMessage)
      socket.off('typing', onTyping)
      socket.off('stopTyping', onStopTyping)
      // If we were mid-typing, tell the other side we stopped.
      if (typingEmitTimerRef.current) {
        clearTimeout(typingEmitTimerRef.current)
        typingEmitTimerRef.current = null
        socket.emit('stopTyping', { conversationId: activeId, userId: user.id })
      }
      if (typingIndicatorTimerRef.current) {
        clearTimeout(typingIndicatorTimerRef.current)
        typingIndicatorTimerRef.current = null
      }
      setTypingUser(null)
      // Do NOT disconnect — the socket is a shared singleton across views.
    }
  }, [activeId, user.id])

  const handleTextChange = (newText: string) => {
    setText(newText)
    const socket = socketRef.current
    if (!socket || !activeId) return
    // Only emit 'typing' on the first keystroke of a typing burst.
    if (!typingEmitTimerRef.current) {
      socket.emit('typing', { conversationId: activeId, userId: user.id, name: user.name })
    }
    // Reset the stop-typing timer; fire stopTyping after 1.5s of silence.
    if (typingEmitTimerRef.current) clearTimeout(typingEmitTimerRef.current)
    typingEmitTimerRef.current = setTimeout(() => {
      socket.emit('stopTyping', { conversationId: activeId, userId: user.id })
      typingEmitTimerRef.current = null
    }, 1500)
  }

  const send = async () => {
    if (!text.trim() || !activeId) return
    setSending(true)
    const body = text
    setText('')
    // Stop typing indicator immediately on send.
    const socket = socketRef.current
    if (socket) {
      if (typingEmitTimerRef.current) {
        clearTimeout(typingEmitTimerRef.current)
        typingEmitTimerRef.current = null
      }
      socket.emit('stopTyping', { conversationId: activeId, userId: user.id })
    }
    try {
      const { message } = await api<{ message: ChatMessage }>(`/api/messages/conversations/${activeId}`, { method: 'POST', body: { body } })
      // Optimistic local append (dedupe in case the socket relay beats us back).
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]))
      setConvos((prev) => {
        const idx = prev.findIndex((c) => c.id === activeId)
        if (idx === -1) return prev
        const next = [...prev]
        next[idx] = {
          ...next[idx],
          lastMessage: { body: message.body, createdAt: message.createdAt, senderId: message.senderId },
          updatedAt: message.createdAt,
        }
        const [moved] = next.splice(idx, 1)
        next.unshift(moved)
        return next
      })
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (e) {
      setText(body)
      toast({ title: 'Failed to send', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const activeConvo = convos.find((c) => c.id === activeId)
  const filtered = convos.filter((c) => c.other.name.toLowerCase().includes(search.toLowerCase()) || c.other.company?.toLowerCase().includes(search.toLowerCase()))

  // Group messages by date
  const getMessageGroups = () => {
    const groups: { date: string; messages: ChatMessage[] }[] = []
    let currentDate = ''
    for (const msg of messages) {
      const msgDate = new Date(msg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (msgDate !== currentDate) {
        currentDate = msgDate
        groups.push({ date: msgDate, messages: [msg] })
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    }
    return groups
  }

  const messageGroups = getMessageGroups()

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col gap-4 lg:h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground">Chat with contractors and subcontractors</p>
        </div>
      </div>

      <Card className="flex min-h-0 flex-1 overflow-hidden border-border/60 p-0 shadow-sm">
        {/* Conversation list */}
        <div className={cn('flex w-full flex-col border-r border-border lg:w-80', activeId && 'hidden lg:flex')}>
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search conversations…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin">
            {loadingList ? (
              <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium">No conversations yet</p>
                <p className="text-xs text-muted-foreground">Start chatting from a job or profile.</p>
              </div>
            ) : (
              filtered.map((c) => {
                const unread = unreadMap[c.id] || 0
                return (
                  <button
                    key={c.id}
                    onClick={() => openConversation(c.id)}
                    className={cn(
                      'flex w-full items-start gap-3 border-b border-border/60 p-3 text-left transition-all hover:bg-accent/50',
                      activeId === c.id && 'bg-primary/5 border-l-2 border-l-primary'
                    )}
                  >
                    <div className="relative">
                      <UserAvatar user={c.other} className="h-10 w-10" />
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('truncate text-sm font-semibold', unread > 0 && 'text-primary')}>{c.other.name}</p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {unread > 0 && (
                            <Badge className="h-4 min-w-4 shrink-0 px-1 text-[10px] leading-none">{unread}</Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">{c.lastMessage ? timeAgo(c.lastMessage.createdAt) : ''}</span>
                        </div>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{c.other.company || c.other.trade}</p>
                      <p className={cn('mt-0.5 truncate text-xs', unread > 0 ? 'font-medium text-foreground' : 'text-muted-foreground/80')}>
                        {c.lastMessage?.body || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Chat panel */}
        {activeId && activeConvo ? (
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-border p-3 bg-card/50 backdrop-blur-sm">
              <button onClick={() => openConversation('')} className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent lg:hidden">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="relative">
                <UserAvatar user={activeConvo.other} className="h-9 w-9" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold">{activeConvo.other.name}</p>
                  {activeConvo.other.verified && <VerifiedBadge className="px-1.5 py-0" />}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />
                  Online · {activeConvo.other.company || activeConvo.other.trade}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-1 overflow-y-auto p-4 scroll-thin bg-muted/20">
              {loadingChat ? (
                <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : messages.length === 0 ? (
                <div className="grid place-items-center py-10 text-center text-sm text-muted-foreground">
                  <div className="rounded-full bg-primary/10 p-4">
                    <MessageSquare className="h-8 w-8 text-primary/50" />
                  </div>
                  <p className="mt-3 font-medium">No messages yet</p>
                  <p className="text-xs">Say hello to start the conversation!</p>
                </div>
              ) : (
                messageGroups.map((group) => (
                  <div key={group.date}>
                    {/* Date separator */}
                    <div className="flex items-center gap-3 py-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-medium text-muted-foreground">{group.date}</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    {/* Messages */}
                    {group.messages.map((m, idx) => {
                      const mine = m.senderId === user.id
                      const prevMsg = idx > 0 ? group.messages[idx - 1] : null
                      const isConsecutive = prevMsg?.senderId === m.senderId
                      return (
                        <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start', !isConsecutive && 'mt-3')}>
                          <div className={cn('max-w-[75%] group', mine ? 'items-end' : 'items-start')}>
                            <div className={cn(
                              'rounded-2xl px-3.5 py-2 text-sm shadow-sm',
                              mine
                                ? 'rounded-br-sm bg-gradient-to-br from-primary to-primary/90 text-primary-foreground'
                                : 'rounded-bl-sm bg-card border border-border/60',
                              isConsecutive && (mine ? 'rounded-tr-2xl' : 'rounded-tl-2xl')
                            )}>
                              <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                            </div>
                            <div className={cn('flex items-center gap-1 mt-0.5 px-1', mine ? 'justify-end' : 'justify-start')}>
                              <span className="text-[10px] text-muted-foreground/60">
                                {new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </span>
                              {mine && (
                                <span className="text-muted-foreground/60">
                                  {m.read ? (
                                    <CheckCheck className="h-3 w-3 text-primary/60" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
              <div ref={endRef} />
            </div>

            {/* Typing indicator */}
            {typingUser && (
              <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-muted-foreground">
                <span className="italic">{typingUser.name} is typing</span>
                <span className="flex gap-0.5">
                  <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                </span>
              </div>
            )}

            {/* Input area */}
            <div className="border-t border-border bg-card/50 backdrop-blur-sm p-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Type a message…"
                  value={text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                  className="flex-1 bg-muted/50"
                />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground">
                  <Smile className="h-4 w-4" />
                </Button>
                <Button size="icon" onClick={send} disabled={sending || !text.trim()} className="shrink-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden flex-1 grid place-items-center lg:grid">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-3 font-medium">Select a conversation</p>
              <p className="text-sm text-muted-foreground">Choose a conversation from the list to start chatting.</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
