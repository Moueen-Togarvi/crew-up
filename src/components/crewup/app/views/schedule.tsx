'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/crewup/shared/empty-state'
import { StatCard } from '@/components/crewup/shared/stat-card'
import { TradeBadge } from '@/components/crewup/shared/badges'
import { formatMoney } from '@/components/crewup/shared/format'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  MapPin,
  DollarSign,
  Users,
  ArrowRight,
  Clock,
  HardHat,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---- Types ----------------------------------------------------------------

interface ScheduleEvent {
  id: string
  title: string
  trade: string
  status: string
  startDate: string
  endDate: string
  budgetMin: number
  budgetMax: number
  location: string
  partnerName: string
  partnerCompany: string | null
  crewSize: number
}

// ---- Trade gradients (mirrors profile.tsx TRADE_GRADIENT map) -------------

const TRADE_GRADIENT: Record<string, string> = {
  Electrical: 'from-amber-400 to-orange-500',
  Plumbing: 'from-emerald-400 to-teal-500',
  HVAC: 'from-rose-400 to-orange-500',
  Roofing: 'from-stone-500 to-stone-700',
  Concrete: 'from-zinc-400 to-zinc-600',
  Framing: 'from-amber-600 to-yellow-700',
  Painting: 'from-rose-400 to-pink-500',
  Flooring: 'from-amber-700 to-orange-800',
  Masonry: 'from-stone-600 to-amber-800',
  Drywall: 'from-zinc-300 to-zinc-500',
  Excavation: 'from-stone-500 to-amber-700',
  Welding: 'from-amber-500 to-red-600',
  Carpentry: 'from-amber-600 to-orange-700',
  Landscaping: 'from-emerald-500 to-green-700',
  Demolition: 'from-red-500 to-stone-700',
  'General Labor': 'from-stone-400 to-stone-600',
}

function tradeGradient(trade: string): string {
  return TRADE_GRADIENT[trade] || 'from-primary to-amber-600'
}

// ---- Date helpers (plain JS, no date-fns) ---------------------------------

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function fmtDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const m1 = start.toLocaleString('en-US', { month: 'short' })
  const m2 = end.toLocaleString('en-US', { month: 'short' })
  const d1 = start.getDate()
  const d2 = end.getDate()
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${m1} ${d1} – ${d2}`
  }
  return `${m1} ${d1} – ${m2} ${d2}`
}

// ---- Status colors (ASSIGNED=amber, COMPLETED=emerald, OPEN=primary) ------

function statusDotClass(status: string): string {
  if (status === 'OPEN') return 'bg-primary'
  if (status === 'ASSIGNED') return 'bg-amber-400'
  if (status === 'COMPLETED') return 'bg-emerald-400'
  return 'bg-muted-foreground'
}

function statusBadgeClass(status: string): string {
  if (status === 'OPEN') return 'bg-primary/10 text-primary'
  if (status === 'ASSIGNED') return 'bg-amber-500/10 text-amber-600'
  if (status === 'COMPLETED') return 'bg-emerald-500/10 text-emerald-600'
  return 'bg-muted text-muted-foreground'
}

function statusLabel(status: string): string {
  if (status === 'OPEN') return 'Open'
  if (status === 'ASSIGNED') return 'Assigned'
  if (status === 'COMPLETED') return 'Completed'
  return status.charAt(0) + status.slice(1).toLowerCase()
}

// ---- Component ------------------------------------------------------------

const UPCOMING_PREVIEW = 6

export function ScheduleView() {
  const openJob = useApp((s) => s.openJob)
  const setView = useApp((s) => s.setView)

  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)

  const today = useMemo(() => startOfDay(new Date()), [])
  const [viewYear, setViewYear] = useState<number>(today.getFullYear())
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const res = await api<{ events: ScheduleEvent[] }>('/api/stats/schedule')
        if (!active) return
        setEvents(res.events || [])
      } catch {
        if (active) setEvents([])
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }
  const goToday = () => {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  // Build calendar grid: 7-col grid with leading (prev month) + trailing (next month) days
  const cells: Date[] = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1)
    const startWeekday = firstOfMonth.getDay() // 0 = Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()
    const out: Date[] = []
    // Leading days from previous month
    for (let i = startWeekday - 1; i >= 0; i--) {
      out.push(new Date(viewYear, viewMonth - 1, daysInPrevMonth - i))
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(new Date(viewYear, viewMonth, d))
    }
    // Trailing days from next month — pad to next multiple of 7
    let nextDay = 1
    while (out.length % 7 !== 0) {
      out.push(new Date(viewYear, viewMonth + 1, nextDay++))
    }
    return out
  }, [viewYear, viewMonth])

  // Events overlapping a given day
  function eventsOnDay(date: Date): ScheduleEvent[] {
    const dStart = startOfDay(date)
    return events.filter((e) => {
      const s = startOfDay(new Date(e.startDate))
      const en = startOfDay(new Date(e.endDate))
      return dStart >= s && dStart <= en
    })
  }

  // ---- Stats ---------------------------------------------------------------

  const thisMonthCount = events.filter((e) => {
    const s = new Date(e.startDate)
    return s.getMonth() === today.getMonth() && s.getFullYear() === today.getFullYear()
  }).length

  const upcoming7DaysCount = events.filter((e) => {
    const s = startOfDay(new Date(e.startDate))
    const diffMs = s.getTime() - today.getTime()
    return diffMs >= 0 && diffMs <= 7 * DAY_MS
  }).length

  const activeJobsCount = useMemo(
    () => new Set(events.map((e) => e.id)).size,
    [events],
  )

  const totalValue = useMemo(
    () => events.reduce((acc, e) => acc + (e.budgetMax || 0), 0),
    [events],
  )

  // ---- Legend trades (top 6 by frequency in current events) ----------------

  const legendTrades = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of events) {
      counts.set(e.trade, (counts.get(e.trade) || 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([trade]) => trade)
  }, [events])

  // ---- Upcoming list (events with startDate >= today) ----------------------

  const upcomingAll = useMemo(() => {
    return [...events]
      .filter((e) => startOfDay(new Date(e.startDate)) >= today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  }, [events, today])

  const visibleUpcoming = showAllUpcoming
    ? upcomingAll
    : upcomingAll.slice(0, UPCOMING_PREVIEW)

  // Day-cell click handler: toggle selection (chips handle their own navigation)
  function handleDayClick(date: Date) {
    if (selectedDate && isSameDay(selectedDate, date)) {
      setSelectedDate(null)
      return
    }
    setSelectedDate(date)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your active jobs and upcoming work at a glance
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          <>
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </>
        ) : (
          <>
            <div
              className="animate-stagger-in"
              style={{ animationDelay: '0ms' }}
            >
              <StatCard
                icon={Calendar}
                label="This month"
                value={thisMonthCount}
                accent="text-amber-600"
                chipGradient="from-amber-400/20 to-amber-500/5"
              />
            </div>
            <div
              className="animate-stagger-in"
              style={{ animationDelay: '60ms' }}
            >
              <StatCard
                icon={Clock}
                label="Upcoming (7 days)"
                value={upcoming7DaysCount}
                accent="text-emerald-600"
                chipGradient="from-emerald-400/20 to-emerald-500/5"
              />
            </div>
            <div
              className="animate-stagger-in"
              style={{ animationDelay: '120ms' }}
            >
              <StatCard
                icon={HardHat}
                label="Active jobs"
                value={activeJobsCount}
                accent="text-primary"
                chipGradient="from-primary/15 to-primary/5"
              />
            </div>
            <div
              className="animate-stagger-in"
              style={{ animationDelay: '180ms' }}
            >
              <StatCard
                icon={DollarSign}
                label="Total value"
                value={formatMoney(totalValue)}
                accent="text-rose-600"
                chipGradient="from-rose-400/20 to-rose-500/5"
              />
            </div>
          </>
        )}
      </div>

      {/* Calendar / loading / empty */}
      {loading ? (
        <Card className="p-4 sm:p-5">
          <Skeleton className="h-8 w-48" />
          <div className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </Card>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No scheduled work yet"
          description="Post a job or accept a bid to see your schedule fill up."
          actionLabel="Browse marketplace"
          onAction={() => setView('marketplace')}
        />
      ) : (
        <>
          {/* Calendar card */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">
                  {MONTHS[viewMonth]} {viewYear}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={prevMonth} aria-label="Previous month">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToday}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth} aria-label="Next month">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {cells.map((date, i) => {
                const dayEvents = eventsOnDay(date)
                const isToday = isSameDay(date, today)
                const isSelected = selectedDate ? isSameDay(selectedDate, date) : false
                const isOutsideMonth = date.getMonth() !== viewMonth
                const firstEvent = dayEvents[0]
                return (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleDayClick(date)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault()
                        handleDayClick(date)
                      }
                    }}
                    className={cn(
                      'group relative min-h-[72px] cursor-pointer border-b border-r border-border/60 p-1.5 text-left transition-colors sm:min-h-[110px] sm:p-2',
                      isOutsideMonth ? 'opacity-40' : 'hover:bg-accent/30',
                    )}
                  >
                    {/* Subtle gradient tint on hover for days with events */}
                    {firstEvent && !isOutsideMonth && (
                      <div
                        className={cn(
                          'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-200 group-hover:opacity-[0.08]',
                          tradeGradient(firstEvent.trade),
                        )}
                      />
                    )}
                    <div className="relative flex items-center justify-end gap-1">
                      {dayEvents.length >= 2 && (
                        <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-primary/15 px-1 text-[9px] font-bold leading-none text-primary">
                          {dayEvents.length}
                        </span>
                      )}
                      <span
                        className={cn(
                          'grid h-6 w-6 place-items-center rounded-full text-xs font-semibold',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : isToday
                              ? 'font-bold text-primary ring-2 ring-primary ring-offset-1 ring-offset-card'
                              : 'text-muted-foreground',
                        )}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                    {/* Dot indicator below the date number */}
                    {firstEvent && (
                      <div className="relative mt-1 flex justify-end pr-1">
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full bg-gradient-to-r',
                            tradeGradient(firstEvent.trade),
                          )}
                        />
                      </div>
                    )}
                    {/* Event chips */}
                    <div className="relative mt-1 space-y-1">
                      {dayEvents.slice(0, 3).map((e, idx) => (
                        <button
                          key={`${e.id}-${i}-${idx}`}
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation()
                            openJob(e.id)
                          }}
                          title={`${e.title} (${e.trade})`}
                          className={cn(
                            'flex w-full items-center gap-1 rounded bg-gradient-to-r px-1 py-0.5 text-left text-[10px] font-medium text-white shadow-sm transition-transform hover:scale-[1.02] sm:text-[11px]',
                            tradeGradient(e.trade),
                          )}
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/80" />
                          <span className="hidden truncate sm:inline">{e.title}</span>
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="px-1 text-[10px] font-medium text-muted-foreground">
                          +{dayEvents.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            {legendTrades.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-muted/20 px-4 py-3 sm:px-5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Legend
                </span>
                {legendTrades.map((trade) => (
                  <div key={trade} className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full bg-gradient-to-r',
                        tradeGradient(trade),
                      )}
                    />
                    <span className="text-xs text-muted-foreground">{trade}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming list */}
          <Card className="overflow-hidden">
            <div className="border-b border-border p-5">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <div>
                  <h3 className="font-bold">Upcoming work</h3>
                  <p className="text-xs text-muted-foreground">
                    {upcomingAll.length === 0
                      ? 'No upcoming work scheduled'
                      : `${upcomingAll.length} scheduled ${upcomingAll.length === 1 ? 'job' : 'jobs'}`}
                  </p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-border">
              {visibleUpcoming.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No upcoming work scheduled.
                </p>
              ) : (
                visibleUpcoming.map((e, index) => (
                  <button
                    key={e.id}
                    onClick={() => openJob(e.id)}
                    style={{ animationDelay: `${index * 50}ms` }}
                    className={cn(
                      'lift-card animate-stagger-in group relative flex w-full items-center gap-4 overflow-hidden p-4 pl-5 text-left transition-colors hover:bg-accent/50',
                    )}
                  >
                    {/* Gradient left border accent (4px wide, full height) */}
                    <div
                      className={cn(
                        'absolute inset-y-0 left-0 w-1 bg-gradient-to-b',
                        tradeGradient(e.trade),
                      )}
                    />
                    <div
                      className={cn(
                        'grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm',
                        tradeGradient(e.trade),
                      )}
                    >
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <TradeBadge trade={e.trade} />
                        <Badge
                          variant="outline"
                          className={cn(
                            'gap-1 border-0 font-medium',
                            statusBadgeClass(e.status),
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', statusDotClass(e.status))} />
                          {statusLabel(e.status)}
                        </Badge>
                      </div>
                      <p className="mt-1.5 truncate font-semibold">{e.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {fmtDateRange(e.startDate, e.endDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {e.partnerName}
                          {e.partnerCompany && (
                            <span className="text-muted-foreground/70">· {e.partnerCompany}</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {e.location}
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold">
                        {formatMoney(e.budgetMin)}–{formatMoney(e.budgetMax)}
                      </p>
                      <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" /> {e.crewSize} crew
                      </p>
                      <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        View job <ArrowRight className="h-3 w-3" />
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
            {upcomingAll.length > UPCOMING_PREVIEW && (
              <div className="flex items-center justify-between border-t border-border bg-muted/20 p-3 sm:px-5">
                <p className="text-xs text-muted-foreground">
                  {showAllUpcoming
                    ? `Showing all ${upcomingAll.length} jobs`
                    : `Showing ${UPCOMING_PREVIEW} of ${upcomingAll.length}`}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllUpcoming((v) => !v)}
                  className="gap-1 text-primary hover:text-primary"
                >
                  {showAllUpcoming ? 'Show less' : 'View all'}
                  {!showAllUpcoming && <ArrowRight className="h-3 w-3" />}
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
