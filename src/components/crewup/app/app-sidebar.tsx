'use client'

import { useApp } from '@/lib/store'
import { Logo } from '@/components/crewup/shared/logo'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Briefcase, Users, FilePlus2, MessageSquare, User, CreditCard, HardHat, Wrench, Building2, Heart, Activity, BarChart3, CalendarDays, Settings, Map, UsersRound } from 'lucide-react'
import type { View } from '@/lib/store'

const contractorNav: { view: View; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'analytics', label: 'Analytics', icon: BarChart3 },
  { view: 'activity', label: 'Activity', icon: Activity },
  { view: 'post-job', label: 'Post a job', icon: FilePlus2 },
  { view: 'marketplace', label: 'My jobs', icon: Briefcase },
  { view: 'directory', label: 'Find subs', icon: Users },
  { view: 'discover', label: 'Discover map', icon: Map },
  { view: 'saved', label: 'Saved', icon: Heart },
  { view: 'schedule', label: 'Schedule', icon: CalendarDays },
  { view: 'messages', label: 'Messages', icon: MessageSquare },
  { view: 'profile', label: 'Profile', icon: User },
  { view: 'billing', label: 'Billing', icon: CreditCard },
  { view: 'settings', label: 'Settings', icon: Settings },
]

const subcontractorNav: { view: View; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'analytics', label: 'Analytics', icon: BarChart3 },
  { view: 'activity', label: 'Activity', icon: Activity },
  { view: 'directory', label: 'Find jobs', icon: Briefcase },
  { view: 'discover', label: 'Discover map', icon: Map },
  { view: 'marketplace', label: 'My bids', icon: FilePlus2 },
  { view: 'crew', label: 'My crew', icon: UsersRound },
  { view: 'saved', label: 'Saved', icon: Heart },
  { view: 'schedule', label: 'Schedule', icon: CalendarDays },
  { view: 'messages', label: 'Messages', icon: MessageSquare },
  { view: 'profile', label: 'Profile', icon: User },
  { view: 'billing', label: 'Billing', icon: CreditCard },
  { view: 'settings', label: 'Settings', icon: Settings },
]

const publicNav: { view: View; label: string; icon: React.ElementType }[] = [
  { view: 'directory', label: 'Marketplace', icon: Briefcase },
]

export function AppSidebar() {
  const user = useApp((s) => s.user)
  const view = useApp((s) => s.view)
  const setView = useApp((s) => s.setView)
  const setDirectoryRole = useApp((s) => s.setDirectoryRole)

  const nav = user?.role === 'CONTRACTOR' ? contractorNav : user?.role === 'SUBCONTRACTOR' ? subcontractorNav : publicNav

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-secondary/30 lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-border px-5">
        <button onClick={() => setView(user ? 'dashboard' : 'landing')}>
          <Logo />
        </button>
      </div>

      {user && (
        <div className="border-b border-border px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className={cn(
              'grid h-9 w-9 place-items-center rounded-lg',
              user.role === 'CONTRACTOR' ? 'bg-primary/10 text-primary' : 'bg-amber-400/15 text-amber-600'
            )}>
              {user.role === 'CONTRACTOR' ? <HardHat className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.role === 'CONTRACTOR' ? 'Contractor' : user.trade || 'Subcontractor'}</p>
            </div>
          </div>
          {user.company && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" /> {user.company}
            </p>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scroll-thin">
        {nav.map((item) => (
          <button
            key={item.view}
            onClick={() => {
              if (item.view === 'directory' && user) setDirectoryRole(user.role)
              setView(item.view)
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              view === item.view
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-primary/5 p-3">
          <p className="text-xs font-semibold text-primary">{user?.plan === 'FREE' ? 'Upgrade to Pro' : 'CrewUp ' + user?.plan}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {user?.plan === 'FREE' ? 'Unlock unlimited bids and posts.' : 'Thanks for being a Pro member.'}
          </p>
          {user?.plan === 'FREE' && (
            <button onClick={() => setView('billing')} className="mt-2 text-xs font-semibold text-primary hover:underline">
              See plans →
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
