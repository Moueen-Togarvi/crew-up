'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { StatusBadge } from '@/components/crewup/shared/badges'
import {
  Search,
  Briefcase,
  Wrench,
  HardHat,
  LayoutDashboard,
  BarChart3,
  Activity,
  FilePlus2,
  CalendarDays,
  Heart,
  MessageSquare,
  User,
  CreditCard,
  LogOut,
  Home,
  Loader2,
  Sun,
  Moon,
  Star,
  MapPin,
  Users,
  Settings,
  Map,
  UsersRound,
} from 'lucide-react'
import type { View } from '@/lib/store'

// --- API response shape ---
interface SearchJob {
  id: string
  title: string
  trade: string
  status: string
  budgetMin: number
  budgetMax: number
  city: string | null
  state: string | null
  contractorName: string
}
interface SearchSubcontractor {
  id: string
  name: string
  trade: string | null
  company: string | null
  city: string | null
  state: string | null
  rating: number
  jobsCompleted: number
}
interface SearchContractor {
  id: string
  name: string
  company: string | null
  city: string | null
  state: string | null
  rating: number
}
interface SearchResponse {
  jobs: SearchJob[]
  subcontractors: SearchSubcontractor[]
  contractors: SearchContractor[]
}

const EMPTY_RESULTS: SearchResponse = { jobs: [], subcontractors: [], contractors: [] }

// --- Role-aware navigation items (kept in sync with app-sidebar.tsx) ---
function getNavItems(role: string | undefined): { view: View; label: string; icon: React.ElementType }[] {
  if (role === 'CONTRACTOR') {
    return [
      { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { view: 'analytics', label: 'Analytics', icon: BarChart3 },
      { view: 'activity', label: 'Activity', icon: Activity },
      { view: 'post-job', label: 'Post a job', icon: FilePlus2 },
      { view: 'marketplace', label: 'My jobs', icon: Briefcase },
      { view: 'directory', label: 'Find subs', icon: Users },
      { view: 'discover', label: 'Discover map', icon: Map },
      { view: 'schedule', label: 'Schedule', icon: CalendarDays },
      { view: 'saved', label: 'Saved', icon: Heart },
      { view: 'messages', label: 'Messages', icon: MessageSquare },
      { view: 'profile', label: 'Profile', icon: User },
      { view: 'billing', label: 'Billing', icon: CreditCard },
      { view: 'settings', label: 'Settings', icon: Settings },
    ]
  }
  return [
    { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { view: 'analytics', label: 'Analytics', icon: BarChart3 },
    { view: 'activity', label: 'Activity', icon: Activity },
    { view: 'directory', label: 'Find jobs', icon: Briefcase },
    { view: 'discover', label: 'Discover map', icon: Map },
    { view: 'marketplace', label: 'My bids', icon: FilePlus2 },
    { view: 'crew', label: 'My crew', icon: UsersRound },
    { view: 'schedule', label: 'Schedule', icon: CalendarDays },
    { view: 'saved', label: 'Saved', icon: Heart },
    { view: 'messages', label: 'Messages', icon: MessageSquare },
    { view: 'profile', label: 'Profile', icon: User },
    { view: 'billing', label: 'Billing', icon: CreditCard },
    { view: 'settings', label: 'Settings', icon: Settings },
  ]
}

// --- Helpers ---
function formatBudget(min: number, max: number): string {
  const fmt = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`)
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`
}

function formatLocation(city: string | null, state: string | null): string | null {
  if (city && state) return `${city}, ${state}`
  if (city) return city
  if (state) return state
  return null
}

export function CommandPalette() {
  const open = useApp((s) => s.commandPaletteOpen)
  const setOpen = useApp((s) => s.setCommandPaletteOpen)
  const setView = useApp((s) => s.setView)
  const openJob = useApp((s) => s.openJob)
  const openProfile = useApp((s) => s.openProfile)
  const logout = useApp((s) => s.logout)
  const user = useApp((s) => s.user)

  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResponse>(EMPTY_RESULTS)
  const [loading, setLoading] = React.useState(false)

  // Global Cmd+K (mac) / Ctrl+K (other) listener
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, setOpen])

  // Reset query/state when palette closes so reopening shows a clean state
  React.useEffect(() => {
    if (!open) {
      setQuery('')
      setResults(EMPTY_RESULTS)
      setLoading(false)
    }
  }, [open])

  // Debounced search (300ms) against /api/search
  React.useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setResults(EMPTY_RESULTS)
      setLoading(false)
      return
    }
    setLoading(true)
    let active = true
    const t = setTimeout(async () => {
      try {
        const data = await api<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`)
        if (!active) return
        setResults(data)
      } catch (e) {
        if (!active) return
        toast({
          title: 'Search failed',
          description: e instanceof Error ? e.message : 'Could not reach search service.',
          variant: 'destructive',
        })
        setResults(EMPTY_RESULTS)
      } finally {
        if (active) setLoading(false)
      }
    }, 300)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [query, open, toast])

  const close = React.useCallback(() => setOpen(false), [setOpen])

  const navItems = getNavItems(user?.role)
  const q = query.trim()
  const showSearchGroups = q.length >= 2
  const hasSearchResults =
    results.jobs.length > 0 ||
    results.subcontractors.length > 0 ||
    results.contractors.length > 0
  const showEmptyState = showSearchGroups && !loading && !hasSearchResults

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="overflow-hidden bg-popover p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search jobs, subcontractors, contractors, and navigate CrewUp.
        </DialogDescription>
        <Command
          shouldFilter={false}
          className="relative **:data-[slot=command-input-wrapper]:h-14 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-14 [&_[cmdk-input]]:text-base [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5"
        >
          <CommandInput
            placeholder="Search jobs, subs, or jump to a page…"
            value={query}
            onValueChange={setQuery}
          />
          {loading && (
            <div className="pointer-events-none absolute right-4 top-5 flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!loading && !query && (
            <div className="pointer-events-none absolute right-4 top-5 hidden items-center gap-1 sm:flex">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                ⌘K
              </kbd>
            </div>
          )}

          <CommandList className="max-h-[60vh] scroll-thin">
            {/* Always-visible navigation */}
            <CommandGroup heading="Quick navigation">
              <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                {navItems.map((item) => (
                  <CommandItem
                    key={item.view}
                    value={`nav-${item.view}-${item.label}`}
                    onSelect={() => {
                      setView(item.view)
                      close()
                    }}
                    className="gap-2.5"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <item.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate text-sm font-medium">{item.label}</span>
                  </CommandItem>
                ))}
              </div>
            </CommandGroup>

            {showSearchGroups && (
              <>
                {results.jobs.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading={`Jobs · ${results.jobs.length}`}>
                      {results.jobs.map((job) => {
                        const loc = formatLocation(job.city, job.state)
                        return (
                          <CommandItem
                            key={job.id}
                            value={`job-${job.id}-${job.title}-${job.trade}`}
                            onSelect={() => {
                              openJob(job.id)
                              close()
                            }}
                            className="gap-3"
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-amber-400/15 text-amber-600">
                              <Briefcase className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold">{job.title}</span>
                                <StatusBadge status={job.status} className="shrink-0 px-1.5 py-0 text-[10px]" />
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground/70">{job.trade}</span>
                                <span aria-hidden>·</span>
                                <span className="text-foreground/70">{formatBudget(job.budgetMin, job.budgetMax)}</span>
                                {loc && (
                                  <>
                                    <span aria-hidden>·</span>
                                    <span className="flex items-center gap-0.5">
                                      <MapPin className="h-3 w-3" />
                                      <span className="truncate">{loc}</span>
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </>
                )}

                {results.subcontractors.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading={`Subcontractors · ${results.subcontractors.length}`}>
                      {results.subcontractors.map((sub) => {
                        const loc = formatLocation(sub.city, sub.state)
                        const meta = [sub.trade, sub.company, loc].filter(Boolean).join(' · ')
                        return (
                          <CommandItem
                            key={sub.id}
                            value={`sub-${sub.id}-${sub.name}-${sub.trade || ''}-${sub.company || ''}`}
                            onSelect={() => {
                              openProfile(sub.id)
                              close()
                            }}
                            className="gap-3"
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-amber-400/15 text-amber-600">
                              <Wrench className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold">{sub.name}</span>
                                {sub.rating > 0 && (
                                  <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-amber-600">
                                    <Star className="h-3 w-3 fill-current" />
                                    {sub.rating.toFixed(1)}
                                  </span>
                                )}
                                {sub.jobsCompleted > 0 && (
                                  <span className="shrink-0 text-[11px] text-muted-foreground">
                                    {sub.jobsCompleted} {sub.jobsCompleted === 1 ? 'job' : 'jobs'}
                                  </span>
                                )}
                              </div>
                              {meta && <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>}
                            </div>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </>
                )}

                {results.contractors.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading={`Contractors · ${results.contractors.length}`}>
                      {results.contractors.map((con) => {
                        const loc = formatLocation(con.city, con.state)
                        const meta = [con.company, loc].filter(Boolean).join(' · ')
                        return (
                          <CommandItem
                            key={con.id}
                            value={`con-${con.id}-${con.name}-${con.company || ''}`}
                            onSelect={() => {
                              openProfile(con.id)
                              close()
                            }}
                            className="gap-3"
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                              <HardHat className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold">{con.name}</span>
                                {con.rating > 0 && (
                                  <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-amber-600">
                                    <Star className="h-3 w-3 fill-current" />
                                    {con.rating.toFixed(1)}
                                  </span>
                                )}
                              </div>
                              {meta && <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>}
                            </div>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </>
                )}

                {showEmptyState && (
                  <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                      <Search className="h-5 w-5 text-muted-foreground" />
                    </span>
                    <p className="text-sm font-medium">No results for &ldquo;{q}&rdquo;</p>
                    <p className="text-xs text-muted-foreground">
                      Try a different name, trade, or location.
                    </p>
                  </div>
                )}
              </>
            )}

            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem
                value="action-toggle-theme-dark-light-mode"
                onSelect={() => {
                  setTheme(theme === 'dark' ? 'light' : 'dark')
                  close()
                }}
                className="gap-3"
              >
                <span className="grid h-7 w-7 place-items-center rounded-md bg-muted text-muted-foreground">
                  {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                </span>
                <span className="text-sm font-medium">Toggle theme</span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {theme === 'dark' ? 'switch to light' : 'switch to dark'}
                </span>
              </CommandItem>
              <CommandItem
                value="action-back-to-home-landing"
                onSelect={() => {
                  setView('landing')
                  close()
                }}
                className="gap-3"
              >
                <span className="grid h-7 w-7 place-items-center rounded-md bg-muted text-muted-foreground">
                  <Home className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-medium">Back to home</span>
              </CommandItem>
              <CommandItem
                value="action-log-out-sign-out"
                onSelect={() => {
                  close()
                  void logout()
                }}
                className="gap-3"
              >
                <span className="grid h-7 w-7 place-items-center rounded-md bg-destructive/10 text-destructive">
                  <LogOut className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-medium text-destructive">Log out</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>

          {/* Footer hint */}
          <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                  ↑
                </kbd>
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                  ↓
                </kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                  ↵
                </kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                  esc
                </kbd>
                close
              </span>
            </div>
            <span className="hidden items-center gap-1.5 font-medium text-foreground/70 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              CrewUp Search
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
