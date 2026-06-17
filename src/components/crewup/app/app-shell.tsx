'use client'

import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store'
import { AppSidebar } from './app-sidebar'
import { AppTopbar } from './app-topbar'
import { DashboardView } from './views/dashboard'
import { MarketplaceView } from './views/marketplace'
import { DirectoryView } from './views/directory'
import { JobDetailView } from './views/job-detail'
import { PostJobView } from './views/post-job'
import { MessagesView } from './views/messages'
import { ProfileView } from './views/profile'
import { BillingView } from './views/billing'
import { SavedView } from './views/saved'
import { ActivityView } from './views/activity'
import { AnalyticsView } from './views/analytics'
import { ScheduleView } from './views/schedule'
import { SettingsView } from './views/settings'
import { CrewView } from './views/crew'
import { DiscoverView } from './views/discover'
import { CommandPalette } from './command-palette'
import { OnboardingWizard } from './onboarding-wizard'
import { cn } from '@/lib/utils'
import { LandingPage } from '@/components/crewup/landing/landing-page'
import { MobileNav } from './mobile-nav'

const AUTH_VIEWS = ['dashboard', 'post-job', 'messages', 'billing', 'profile', 'saved', 'activity', 'analytics', 'schedule', 'settings', 'crew', 'discover']

export function AppShell() {
  const user = useApp((s) => s.user)
  const view = useApp((s) => s.view)
  const openAuth = useApp((s) => s.openAuth)
  const setView = useApp((s) => s.setView)
  const mainRef = useRef<HTMLDivElement>(null)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  // If an auth-required view is active without a user, bounce to landing + prompt auth
  useEffect(() => {
    if (!user && AUTH_VIEWS.includes(view)) {
      setView('landing')
      openAuth('login')
    }
  }, [user, view, setView, openAuth])

  // Auto-trigger onboarding for newly-signed-up users (no bio AND created within last 5 minutes AND not seen before)
  // Uses a guard flag to avoid repeated checks after the first resolution.
  useEffect(() => {
    if (!user || onboardingChecked) return
    const markChecked = () => setOnboardingChecked(true)
    try {
      const seenKey = `crewup_onboarding_seen_${user.id}`
      const seen = localStorage.getItem(seenKey)
      if (seen) {
        markChecked()
        return
      }
      const created = new Date(user.createdAt).getTime()
      const fiveMinAgo = Date.now() - 5 * 60 * 1000
      const isRecent = created > fiveMinAgo
      const isIncomplete = !user.bio && (user.role === 'SUBCONTRACTOR' ? !user.trade : !user.company)
      if (isRecent && isIncomplete) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOnboardingOpen(true)
      }
      markChecked()
    } catch {
      markChecked()
    }
  }, [user, onboardingChecked])

  // Mark onboarding as seen when closed
  const handleOnboardingChange = (open: boolean) => {
    setOnboardingOpen(open)
    if (!open && user) {
      try {
        localStorage.setItem(`crewup_onboarding_seen_${user.id}`, '1')
      } catch {
        /* ignore */
      }
    }
  }

  // Page transition effect
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    el.classList.remove('animate-fade-in-up')
    void el.offsetWidth
    el.classList.add('animate-fade-in-up')
  }, [view])

  // If no user and not in a public view, show landing
  if (!user && view === 'landing') {
    return <LandingPage />
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 overflow-x-hidden pb-24 lg:pb-0">
          <div ref={mainRef} className={cn('mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8')}>
            {view === 'dashboard' && <DashboardView />}
            {view === 'marketplace' && <MarketplaceView />}
            {view === 'directory' && <DirectoryView />}
            {view === 'job-detail' && <JobDetailView />}
            {view === 'post-job' && <PostJobView />}
            {view === 'messages' && <MessagesView />}
            {view === 'profile' && <ProfileView />}
            {view === 'billing' && <BillingView />}
            {view === 'saved' && <SavedView />}
            {view === 'activity' && <ActivityView />}
            {view === 'analytics' && <AnalyticsView />}
            {view === 'schedule' && <ScheduleView />}
            {view === 'settings' && <SettingsView />}
            {view === 'crew' && <CrewView />}
            {view === 'discover' && <DiscoverView />}
          </div>
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
      {user && (
        <OnboardingWizard
          open={onboardingOpen}
          onOpenChange={handleOnboardingChange}
          user={user}
        />
      )}
    </div>
  )
}
