'use client'

import { create } from 'zustand'
import type { PublicUser, JobWithRelations } from './constants'
import { api } from './api'

export type View =
  | 'landing'
  | 'dashboard'
  | 'marketplace'
  | 'job-detail'
  | 'post-job'
  | 'messages'
  | 'profile'
  | 'billing'
  | 'directory'
  | 'saved'
  | 'analytics'
  | 'activity'
  | 'schedule'
  | 'settings'
  | 'crew'
  | 'discover'

interface AppState {
  // auth
  user: PublicUser | null
  authLoading: boolean
  authModalOpen: boolean
  authMode: 'login' | 'signup'
  authResolved: boolean
  // navigation
  view: View
  activeJobId: string | null
  activeConversationId: string | null
  profileUserId: string | null
  directoryRole: 'SUBCONTRACTOR' | 'CONTRACTOR'
  // jobs cache
  jobs: JobWithRelations[]
  jobsLoading: boolean
  // command palette (Cmd+K / Ctrl+K)
  commandPaletteOpen: boolean
  // actions
  setView: (v: View) => void
  setCommandPaletteOpen: (open: boolean) => void
  openAuth: (mode?: 'login' | 'signup') => void
  closeAuth: () => void
  setUser: (u: PublicUser | null) => void
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
  openJob: (id: string) => void
  openProfile: (id: string) => void
  openConversation: (id: string) => void
  setDirectoryRole: (r: 'SUBCONTRACTOR' | 'CONTRACTOR') => void
  loadJobs: () => Promise<void>
}

export const useApp = create<AppState>((set, get) => ({
  user: null,
  authLoading: true,
  authModalOpen: false,
  authMode: 'login',
  authResolved: false,
  view: 'landing',
  activeJobId: null,
  activeConversationId: null,
  profileUserId: null,
  directoryRole: 'SUBCONTRACTOR',
  jobs: [],
  jobsLoading: false,
  commandPaletteOpen: false,

  setView: (v) => {
    set({ view: v })
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  },
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  openAuth: (mode = 'login') => set({ authModalOpen: true, authMode: mode }),
  closeAuth: () => set({ authModalOpen: false }),
  setUser: (u) => set({ user: u }),
  refreshUser: async () => {
    try {
      const { user } = await api<{ user: PublicUser | null }>('/api/auth/me')
      // On first resolution, drop a restored session into the dashboard.
      const firstResolve = !get().authResolved
      set({ user, authLoading: false, authResolved: true })
      if (firstResolve && user && get().view === 'landing') {
        set({ view: 'dashboard' })
      }
    } catch {
      set({ authLoading: false, authResolved: true })
    }
  },
  logout: async () => {
    await api('/api/auth/logout', { method: 'POST' })
    set({ user: null, view: 'landing' })
  },
  openJob: (id) => set({ activeJobId: id, view: 'job-detail' }),
  openProfile: (id) => set({ profileUserId: id, view: 'profile' }),
  openConversation: (id) => set({ activeConversationId: id, view: 'messages' }),
  setDirectoryRole: (r) => set({ directoryRole: r }),
  loadJobs: async () => {
    set({ jobsLoading: true })
    try {
      const { jobs } = await api<{ jobs: JobWithRelations[] }>('/api/jobs')
      set({ jobs, jobsLoading: false })
    } catch {
      set({ jobsLoading: false })
    }
  },
}))

// helper hook for components
export function useRequireAuth() {
  const user = useApp((s) => s.user)
  const openAuth = useApp((s) => s.openAuth)
  return (cb?: () => void) => {
    if (!user) {
      openAuth('login')
      return false
    }
    cb?.()
    return true
  }
}
