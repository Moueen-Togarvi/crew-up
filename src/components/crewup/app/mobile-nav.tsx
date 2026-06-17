'use client'

import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Briefcase, Users, MessageSquare, User, Heart, Activity, BarChart3, CalendarDays, Map, UsersRound } from 'lucide-react'
import type { View } from '@/lib/store'

export function MobileNav() {
  const user = useApp((s) => s.user)
  const view = useApp((s) => s.view)
  const setView = useApp((s) => s.setView)
  const setDirectoryRole = useApp((s) => s.setDirectoryRole)

  if (!user) return null

  const items: { view: View; label: string; icon: React.ElementType }[] =
    user.role === 'CONTRACTOR'
      ? [
          { view: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { view: 'discover', label: 'Map', icon: Map },
          { view: 'analytics', label: 'Stats', icon: BarChart3 },
          { view: 'activity', label: 'Activity', icon: Activity },
          { view: 'directory', label: 'Subs', icon: Users },
          { view: 'saved', label: 'Saved', icon: Heart },
          { view: 'schedule', label: 'Sched', icon: CalendarDays },
          { view: 'messages', label: 'Chat', icon: MessageSquare },
          { view: 'profile', label: 'Me', icon: User },
        ]
      : [
          { view: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { view: 'discover', label: 'Map', icon: Map },
          { view: 'analytics', label: 'Stats', icon: BarChart3 },
          { view: 'activity', label: 'Activity', icon: Activity },
          { view: 'directory', label: 'Jobs', icon: Briefcase },
          { view: 'crew', label: 'Crew', icon: UsersRound },
          { view: 'saved', label: 'Saved', icon: Heart },
          { view: 'messages', label: 'Chat', icon: MessageSquare },
          { view: 'profile', label: 'Me', icon: User },
        ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-lg lg:hidden">
      <div className="grid grid-cols-9">
        {items.map((item) => (
          <button
            key={item.view}
            onClick={() => {
              if (item.view === 'directory') setDirectoryRole(user.role)
              setView(item.view)
            }}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
              view === item.view ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
