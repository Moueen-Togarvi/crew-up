'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import type { JobWithRelations, PublicUser } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { TradeBadge, VerifiedBadge, StatusBadge } from '@/components/crewup/shared/badges'
import { Rating } from '@/components/crewup/shared/rating'
import { formatMoney, timeAgo } from '@/components/crewup/shared/format'
import { EmptyState } from '@/components/crewup/shared/empty-state'
import {
  MapPin,
  Search,
  X,
  Loader2,
  Briefcase,
  Users,
  Navigation,
  Sparkles,
  TrendingUp,
  Star,
  Crosshair,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Approximate lat/long → x/y % on a stylized US map.
// x = (long + 125) / 60 * 100  (range: -125 → -65 → 0% → 100%)
// y = (50 - lat) / 25 * 100     (range: 50 → 25 → 0% → 100%)
const CITY_COORDS: Record<string, { x: number; y: number; state: string }> = {
  'Seattle, WA': { x: 13, y: 18, state: 'WA' },
  'Portland, OR': { x: 11, y: 24, state: 'OR' },
  'San Francisco, CA': { x: 9, y: 38, state: 'CA' },
  'Los Angeles, CA': { x: 13, y: 48, state: 'CA' },
  'San Diego, CA': { x: 14, y: 53, state: 'CA' },
  'Las Vegas, NV': { x: 18, y: 47, state: 'NV' },
  'Phoenix, AZ': { x: 22, y: 50, state: 'AZ' },
  'Salt Lake City, UT': { x: 23, y: 36, state: 'UT' },
  'Denver, CO': { x: 32, y: 39, state: 'CO' },
  'Albuquerque, NM': { x: 31, y: 50, state: 'NM' },
  'Dallas, TX': { x: 41, y: 56, state: 'TX' },
  'Houston, TX': { x: 45, y: 60, state: 'TX' },
  'Austin, TX': { x: 42, y: 58, state: 'TX' },
  'San Antonio, TX': { x: 40, y: 60, state: 'TX' },
  'Chicago, IL': { x: 53, y: 35, state: 'IL' },
  'Minneapolis, MN': { x: 51, y: 25, state: 'MN' },
  'Kansas City, MO': { x: 45, y: 43, state: 'MO' },
  'St. Louis, MO': { x: 48, y: 43, state: 'MO' },
  'Nashville, TN': { x: 53, y: 50, state: 'TN' },
  'Memphis, TN': { x: 49, y: 50, state: 'TN' },
  'Atlanta, GA': { x: 58, y: 54, state: 'GA' },
  'Miami, FL': { x: 67, y: 67, state: 'FL' },
  'Tampa, FL': { x: 62, y: 64, state: 'FL' },
  'Charlotte, NC': { x: 60, y: 49, state: 'NC' },
  'Raleigh, NC': { x: 63, y: 46, state: 'NC' },
  'Washington, DC': { x: 67, y: 41, state: 'DC' },
  'Philadelphia, PA': { x: 70, y: 39, state: 'PA' },
  'New York, NY': { x: 72, y: 35, state: 'NY' },
  'Boston, MA': { x: 78, y: 28, state: 'MA' },
  'Pittsburgh, PA': { x: 65, y: 39, state: 'PA' },
  'Cleveland, OH': { x: 60, y: 38, state: 'OH' },
  'Detroit, MI': { x: 57, y: 33, state: 'MI' },
  'Columbus, OH': { x: 62, y: 40, state: 'OH' },
  'Indianapolis, IN': { x: 55, y: 41, state: 'IN' },
  'Cincinnati, OH': { x: 57, y: 43, state: 'OH' },
  'New Orleans, LA': { x: 47, y: 62, state: 'LA' },
  'Oklahoma City, OK': { x: 36, y: 52, state: 'OK' },
  'Boise, ID': { x: 18, y: 30, state: 'ID' },
  'Cheyenne, WY': { x: 28, y: 35, state: 'WY' },
  'Billings, MT': { x: 30, y: 24, state: 'MT' },
  'Omaha, NE': { x: 41, y: 38, state: 'NE' },
  'Des Moines, IA': { x: 45, y: 38, state: 'IA' },
}

// Haversine distance between two city strings — falls back to a deterministic
// pseudo-distance when one city is unknown so all results still sort cleanly.
function distanceBetween(a: string | null, b: string | null): number {
  if (!a || !b) return 9999
  const ca = CITY_COORDS[a]
  const cb = CITY_COORDS[b]
  if (!ca || !cb) {
    // hash-based stable fallback
    const h = (s: string) => s.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)
    return 200 + (Math.abs(h(a) ^ h(b)) % 1800)
  }
  const dx = ca.x - cb.x
  const dy = ca.y - cb.y
  // ~25 miles per % unit on our stylized map
  return Math.sqrt(dx * dx + dy * dy) * 25
}

function cityKey(city: string | null, state: string | null): string | null {
  if (!city) return null
  return state ? `${city}, ${state}` : city
}

interface MapPin {
  id: string
  key: string
  label: string
  x: number
  y: number
  count: number
  kind: 'job' | 'sub'
}

const TRADE_FILTERS = [
  'All',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Roofing',
  'Concrete',
  'Framing',
  'Painting',
  'Landscaping',
]

export function DiscoverView() {
  const user = useApp((s) => s.user)!
  const openJob = useApp((s) => s.openJob)
  const openProfile = useApp((s) => s.openProfile)
  const isContractor = user.role === 'CONTRACTOR'

  const [jobs, setJobs] = useState<JobWithRelations[]>([])
  const [subs, setSubs] = useState<PublicUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tradeFilter, setTradeFilter] = useState('All')
  const [activePinKey, setActivePinKey] = useState<string | null>(null)
  const [userLoc, setUserLoc] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const [jobsRes, subsRes] = await Promise.all([
          api<{ jobs: JobWithRelations[] }>('/api/jobs?status=OPEN'),
          api<{ users: PublicUser[] }>('/api/marketplace/subcontractors'),
        ])
        if (!active) return
        setJobs(jobsRes.jobs || [])
        setSubs(subsRes.users || [])
        // pick a deterministic "home" city for the user based on their state
        if (user.city && user.state) {
          setUserLoc(cityKey(user.city, user.state))
        } else {
          // fallback: Denver
          setUserLoc('Denver, CO')
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [user.city, user.state])

  // Apply search + trade filter
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (tradeFilter !== 'All' && j.trade !== tradeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          j.title.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q) ||
          (j.city || '').toLowerCase().includes(q) ||
          (j.state || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [jobs, search, tradeFilter])

  const filteredSubs = useMemo(() => {
    return subs.filter((s) => {
      if (tradeFilter !== 'All' && s.trade !== tradeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          s.name.toLowerCase().includes(q) ||
          (s.company || '').toLowerCase().includes(q) ||
          (s.trade || '').toLowerCase().includes(q) ||
          (s.city || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [subs, search, tradeFilter])

  // Build map pins (cluster by city)
  const pins: MapPin[] = useMemo(() => {
    const map = new Map<string, MapPin>()
    if (isContractor) {
      for (const s of filteredSubs) {
        const key = cityKey(s.city, s.state)
        if (!key) continue
        const coords = CITY_COORDS[key]
        if (!coords) continue
        const existing = map.get(key)
        if (existing) {
          existing.count += 1
        } else {
          map.set(key, {
            id: `sub-${key}`,
            key,
            label: key,
            x: coords.x,
            y: coords.y,
            count: 1,
            kind: 'sub',
          })
        }
      }
    } else {
      for (const j of filteredJobs) {
        const key = cityKey(j.city, j.state)
        if (!key) continue
        const coords = CITY_COORDS[key]
        if (!coords) continue
        const existing = map.get(key)
        if (existing) {
          existing.count += 1
        } else {
          map.set(key, {
            id: `job-${key}`,
            key,
            label: key,
            x: coords.x,
            y: coords.y,
            count: 1,
            kind: 'job',
          })
        }
      }
    }
    return Array.from(map.values())
  }, [filteredJobs, filteredSubs, isContractor])

  // Sort list by distance from user
  const sortedJobs = useMemo(() => {
    return [...filteredJobs]
      .map((j) => ({
        job: j,
        dist: distanceBetween(userLoc, cityKey(j.city, j.state)),
      }))
      .sort((a, b) => a.dist - b.dist)
  }, [filteredJobs, userLoc])

  const sortedSubs = useMemo(() => {
    return [...filteredSubs]
      .map((s) => ({
        sub: s,
        dist: distanceBetween(userLoc, cityKey(s.city, s.state)),
      }))
      .sort((a, b) => a.dist - b.dist)
  }, [filteredSubs, userLoc])

  const list = isContractor ? sortedSubs : sortedJobs
  const activePin = pins.find((p) => p.key === activePinKey)
  const filteredList = activePin
    ? list.filter((item) => {
        const key = isContractor
          ? cityKey((item as { sub: PublicUser }).sub.city, (item as { sub: PublicUser }).sub.state)
          : cityKey((item as { job: JobWithRelations }).job.city, (item as { job: JobWithRelations }).job.state)
        return key === activePinKey
      })
    : list

  const totalShown = isContractor ? filteredSubs.length : filteredJobs.length
  const cityCount = pins.length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-card to-amber-400/5 p-5">
        <div className="mesh-gradient-bg absolute inset-0 opacity-50" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                <Navigation className="h-4 w-4" />
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight">Discover</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {isContractor
                ? 'Find skilled subcontractors across the country, plotted on a live map.'
                : 'Find open jobs near you and across the nation, plotted on a live map.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-3 py-1.5 text-xs font-medium">
              <Crosshair className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">From:</span>
              <span className="text-foreground">{userLoc || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-3 py-1.5 text-xs font-medium">
              <MapPin className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-muted-foreground">Cities:</span>
              <span className="text-foreground">{cityCount}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-3 py-1.5 text-xs font-medium">
              <Layers className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-muted-foreground">Total:</span>
              <span className="text-foreground">{totalShown}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search + trade filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isContractor ? 'Search subcontractors by name, trade, city…' : 'Search jobs by title, trade, city…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {TRADE_FILTERS.map((t) => (
          <button
            key={t}
            onClick={() => setTradeFilter(t)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
              tradeFilter === t
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Map + list */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Map */}
        <Card className="relative overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
                <MapPin className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Live map</p>
                <p className="text-[11px] text-muted-foreground">
                  {isContractor ? 'Subcontractor locations' : 'Open job locations'}
                </p>
              </div>
            </div>
            {activePin && (
              <button
                onClick={() => setActivePinKey(null)}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <X className="h-3 w-3" /> Clear filter
              </button>
            )}
          </div>
          <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-primary/5 via-card to-amber-400/5">
            {/* Grid backdrop */}
            <div
              className="absolute inset-0 opacity-40"
              aria-hidden
              style={{
                backgroundImage:
                  'linear-gradient(to right, hsl(var(--border) / 0.4) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.4) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            {/* Faux US landmass blob (stylized) */}
            <svg
              viewBox="0 0 100 60"
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M5,18 Q8,12 14,12 L22,10 Q30,8 38,12 L48,12 Q56,10 64,14 L74,12 Q82,14 88,20 L94,26 Q96,32 92,38 L86,44 Q78,48 70,46 L60,48 Q52,52 44,50 L34,52 Q26,54 20,50 L12,48 Q6,42 6,34 Z"
                fill="hsl(var(--primary) / 0.06)"
                stroke="hsl(var(--primary) / 0.2)"
                strokeWidth="0.3"
              />
            </svg>
            {/* City dots */}
            {loading ? (
              <div className="absolute inset-0 grid place-items-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : pins.length === 0 ? (
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <MapPin className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm font-medium text-muted-foreground">No locations to show</p>
                  <p className="text-xs text-muted-foreground/70">Try a different trade filter.</p>
                </div>
              </div>
            ) : (
              pins.map((pin) => {
                const isActive = activePinKey === pin.key
                const size = pin.count === 1 ? 14 : pin.count < 4 ? 20 : pin.count < 8 ? 26 : 32
                return (
                  <button
                    key={pin.id}
                    onClick={() => setActivePinKey(isActive ? null : pin.key)}
                    className="group absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:z-20 hover:scale-110"
                    style={{ left: `${pin.x}%`, top: `${pin.y}%`, zIndex: isActive ? 30 : 10 }}
                    title={`${pin.label} · ${pin.count} ${pin.kind === 'job' ? 'jobs' : 'subs'}`}
                    aria-label={`${pin.label}, ${pin.count} ${pin.kind === 'job' ? 'jobs' : 'subcontractors'}`}
                  >
                    {/* Pulse ring for active */}
                    {isActive && (
                      <span
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-primary/40"
                        style={{ width: size + 12, height: size + 12 }}
                        aria-hidden
                      />
                    )}
                    <span
                      className={cn(
                        'relative grid place-items-center rounded-full font-bold text-white shadow-md transition-all',
                        isActive
                          ? 'bg-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-background'
                          : pin.kind === 'job'
                          ? 'bg-gradient-to-br from-amber-500 to-amber-600 group-hover:from-amber-600 group-hover:to-amber-700'
                          : 'bg-gradient-to-br from-primary to-primary/80 group-hover:from-primary/90 group-hover:to-primary/70'
                      )}
                      style={{ width: size, height: size, fontSize: size < 18 ? 8 : 10 }}
                    >
                      {pin.count > 1 ? pin.count : ''}
                    </span>
                    {/* Label tooltip on hover/active */}
                    <span
                      className={cn(
                        'pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[10px] font-semibold shadow-md transition-opacity',
                        isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      )}
                    >
                      {pin.label}
                    </span>
                  </button>
                )
              })
            )}
            {/* User location marker */}
            {userLoc && CITY_COORDS[userLoc] && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${CITY_COORDS[userLoc].x}%`, top: `${CITY_COORDS[userLoc].y}%`, zIndex: 5 }}
                title={`Your location: ${userLoc}`}
                aria-label={`Your location: ${userLoc}`}
              >
                <Crosshair className="h-5 w-5 text-primary animate-pulse" />
              </div>
            )}
            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-lg border border-border/60 bg-card/80 px-3 py-1.5 text-[10px] font-medium backdrop-blur-sm">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-amber-500 to-amber-600" />
                Jobs
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-primary to-primary/80" />
                Subs
              </span>
              <span className="flex items-center gap-1">
                <Crosshair className="h-3 w-3 text-primary" />
                You
              </span>
            </div>
          </div>
        </Card>

        {/* List */}
        <Card className="flex max-h-[640px] flex-col overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
                {isContractor ? <Users className="h-3.5 w-3.5" /> : <Briefcase className="h-3.5 w-3.5" />}
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {activePin ? `${activePin.label}` : isContractor ? 'Nearest subs' : 'Nearest jobs'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {filteredList.length} {filteredList.length === 1 ? 'result' : 'results'}
                  {activePin ? ' in this city' : ' sorted by distance'}
                </p>
              </div>
            </div>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin">
            {loading ? (
              <div className="grid place-items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredList.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={isContractor ? Users : Briefcase}
                  title={search || tradeFilter !== 'All' ? 'No matches' : activePin ? 'Nothing here yet' : 'Nothing to show'}
                  description={
                    search || tradeFilter !== 'All'
                      ? 'Try a different search or trade filter.'
                      : activePin
                      ? 'Try selecting a different city or clear the filter.'
                      : 'New opportunities appear here as they are posted.'
                  }
                  actionLabel={search || tradeFilter !== 'All' ? 'Clear filters' : undefined}
                  onAction={search || tradeFilter !== 'All' ? () => { setSearch(''); setTradeFilter('All') } : undefined}
                />
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {filteredList.map((item, idx) => {
                  if (isContractor) {
                    const { sub, dist } = item as { sub: PublicUser; dist: number }
                    return (
                      <li
                        key={sub.id}
                        className="animate-slide-in-right"
                        style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                      >
                        <button
                          onClick={() => openProfile(sub.id)}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                        >
                          <div className="relative">
                            <UserAvatar user={sub} className="h-10 w-10" />
                            {sub.verified && (
                              <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-background">
                                <VerifiedBadge className="h-3.5 w-3.5 p-0" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold">{sub.name}</p>
                              <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                                {dist < 10 ? '< 1 mi' : `${Math.round(dist)} mi`}
                              </span>
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {sub.company || sub.trade}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {sub.trade && <TradeBadge trade={sub.trade} className="px-1.5 py-0 text-[10px]" />}
                              {sub.city && sub.state && (
                                <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                                  <MapPin className="mr-0.5 h-2.5 w-2.5" />
                                  {sub.city}, {sub.state}
                                </Badge>
                              )}
                              {sub.rating > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-600">
                                  <Star className="h-2.5 w-2.5 fill-current" />
                                  {sub.rating.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    )
                  } else {
                    const { job, dist } = item as { job: JobWithRelations; dist: number }
                    return (
                      <li
                        key={job.id}
                        className="animate-slide-in-right"
                        style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                      >
                        <button
                          onClick={() => openJob(job.id)}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm">
                            <Briefcase className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold">{job.title}</p>
                              <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                                {dist < 10 ? '< 1 mi' : `${Math.round(dist)} mi`}
                              </span>
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {formatMoney(job.budgetMin)} – {formatMoney(job.budgetMax)} · {job.duration}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <TradeBadge trade={job.trade} className="px-1.5 py-0 text-[10px]" />
                              <StatusBadge status={job.status} className="px-1.5 py-0 text-[10px]" />
                              {job.city && job.state && (
                                <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                                  <MapPin className="mr-0.5 h-2.5 w-2.5" />
                                  {job.city}, {job.state}
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                {timeAgo(job.createdAt)}
                              </span>
                            </div>
                          </div>
                        </button>
                      </li>
                    )
                  }
                })}
              </ul>
            )}
          </div>
          {/* Footer stats */}
          {!loading && filteredList.length > 0 && (
            <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  Avg distance: {filteredList.length > 0
                    ? Math.round(
                        filteredList
                          .slice(0, 8)
                          .reduce((sum, it) => sum + (isContractor
                            ? (it as { sub: PublicUser; dist: number }).dist
                            : (it as { job: JobWithRelations; dist: number }).dist), 0) /
                          Math.min(8, filteredList.length)
                      )
                    : 0} mi
                </span>
                <span>Showing {filteredList.length} of {totalShown}</span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
