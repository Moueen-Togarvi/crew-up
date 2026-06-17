'use client'

import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { Logo } from '@/components/crewup/shared/logo'
import { timeAgo } from '@/components/crewup/shared/format'
import { Bell, LogOut, Home, Settings, CreditCard, CheckCheck, Inbox, Search } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  read: boolean
  createdAt: string
}

const NOTIF_ICON: Record<string, string> = {
  NEW_BID: '🛠️',
  BID_ACCEPTED: '🎉',
  BID_REJECTED: '📨',
  NEW_MESSAGE: '💬',
  NEW_REVIEW: '⭐',
  JOB_ASSIGNED: '✅',
}

export function AppTopbar() {
  const user = useApp((s) => s.user)
  const logout = useApp((s) => s.logout)
  const setView = useApp((s) => s.setView)
  const openAuth = useApp((s) => s.openAuth)
  const openJob = useApp((s) => s.openJob)
  const openConversation = useApp((s) => s.openConversation)
  const setCommandPaletteOpen = useApp((s) => s.setCommandPaletteOpen)

  const [notifs, setNotifs] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [bellOpen, setBellOpen] = useState(false)
  const prevUnread = useRef(0)

  // Poll notifications every 20s when logged in
  useEffect(() => {
    if (!user) return
    let active = true
    const load = async () => {
      try {
        const { notifications, unreadCount } = await api<{ notifications: NotificationItem[]; unreadCount: number }>('/api/notifications?limit=20')
        if (!active) return
        setNotifs(notifications)
        setUnread(unreadCount)
      } catch { /* ignore */ }
    }
    load()
    const t = setInterval(load, 20000)
    return () => { active = false; clearInterval(t) }
  }, [user])

  // Pulse animation trigger when new notifications arrive
  useEffect(() => {
    if (unread > prevUnread.current && prevUnread.current !== -1) {
      const el = document.getElementById('notif-bell')
      if (el) {
        el.classList.remove('animate-bell-ring')
        void el.offsetWidth
        el.classList.add('animate-bell-ring')
      }
    }
    prevUnread.current = unread
  }, [unread])

  const markAllRead = async () => {
    setNotifs((n) => n.map((x) => ({ ...x, read: true })))
    setUnread(0)
    try { await api('/api/notifications', { method: 'POST' }) } catch { /* ignore */ }
  }

  const markOneRead = async (n: NotificationItem) => {
    setNotifs((arr) => arr.map((x) => x.id === n.id ? { ...x, read: true } : x))
    setUnread((u) => Math.max(0, u - 1))
    try { await api(`/api/notifications/${n.id}/read`, { method: 'POST' }) } catch { /* ignore */ }
  }

  const handleNotifClick = (n: NotificationItem) => {
    markOneRead(n)
    setBellOpen(false)
    if (n.type === 'NEW_MESSAGE' && n.link) {
      openConversation(n.link)
    } else if (n.link) {
      openJob(n.link)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-lg sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 lg:hidden">
        <button onClick={() => setView(user ? 'dashboard' : 'landing')}>
          <Logo />
        </button>
      </div>
      <div className="hidden lg:block">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {greeting()}, {user?.name.split(' ')[0] || 'there'} 👋
        </h2>
      </div>

      <div className="flex items-center gap-2">
        {user ? (
          <>
            {/* Search trigger — desktop (button styled like an input) */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Open command palette"
              className="hidden h-9 w-[240px] items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Search jobs, subs…</span>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                ⌘K
              </kbd>
            </button>
            {/* Search trigger — mobile (icon only) */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open command palette"
              onClick={() => setCommandPaletteOpen(true)}
              className="lg:hidden"
            >
              <Search className="h-4.5 w-4.5" />
            </Button>
            <DropdownMenu open={bellOpen} onOpenChange={setBellOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications" id="notif-bell">
                  <Bell className="h-4.5 w-4.5" />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm ring-2 ring-background">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0 sm:w-96">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-bold">Notifications</p>
                    <p className="text-xs text-muted-foreground">{unread > 0 ? `${unread} unread` : 'You\'re all caught up'}</p>
                  </div>
                  {notifs.length > 0 && (
                    <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      <CheckCheck className="h-3.5 w-3.5" /> Mark all
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto scroll-thin">
                  {notifs.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <Inbox className="mx-auto h-10 w-10 text-muted-foreground/40" />
                      <p className="mt-2 text-sm font-medium">No notifications yet</p>
                      <p className="text-xs text-muted-foreground">Bid updates and messages will show up here.</p>
                    </div>
                  ) : (
                    notifs.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={cn(
                          'flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/60',
                          !n.read && 'bg-primary/5'
                        )}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-base">
                          {NOTIF_ICON[n.type] || '🔔'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold">{n.title}</p>
                            {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-accent">
                  <UserAvatar user={user || { name: '' }} className="h-8 w-8" />
                  <span className="hidden text-sm font-medium sm:block">{user?.name.split(' ')[0]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setView('profile')}>
                  <Settings className="mr-2 h-4 w-4" /> Profile & settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('billing')}>
                  <CreditCard className="mr-2 h-4 w-4" /> Billing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('landing')}>
                  <Home className="mr-2 h-4 w-4" /> Back to home
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => openAuth('login')}>Log in</Button>
            <Button onClick={() => openAuth('signup')}>Get started</Button>
          </>
        )}
      </div>
    </header>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

