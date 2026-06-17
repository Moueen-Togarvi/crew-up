'use client'

import { useEffect } from 'react'
import { useApp } from '@/lib/store'
import { LandingPage } from '@/components/crewup/landing/landing-page'
import { AuthModal } from '@/components/crewup/auth/auth-modal'
import { AppShell } from '@/components/crewup/app/app-shell'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const user = useApp((s) => s.user)
  const authLoading = useApp((s) => s.authLoading)
  const authResolved = useApp((s) => s.authResolved)
  const view = useApp((s) => s.view)
  const refreshUser = useApp((s) => s.refreshUser)
  const authModalOpen = useApp((s) => s.authModalOpen)

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  // Show a loader only on the very first paint before we know if there's a session.
  if (authLoading && !authResolved) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (view === 'landing') {
    return (
      <>
        <LandingPage />
        <AuthModal open={authModalOpen} />
      </>
    )
  }

  void user
  return (
    <>
      <AppShell />
      <AuthModal open={authModalOpen} />
    </>
  )
}
