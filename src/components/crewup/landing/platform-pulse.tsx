'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { AnimatedNumber } from '@/components/crewup/shared/animated-number'
import { Card } from '@/components/ui/card'
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Star,
  Activity,
  Briefcase,
  Gavel,
  FileCheck2,
  MessageSquare,
  Zap,
  Droplets,
  Hammer,
  Mountain,
  Layers,
  Snowflake,
  Paintbrush,
  Wind,
  Flame,
  HardHat,
  Wrench,
} from 'lucide-react'

/* ───────────── Live activity ticker ───────────── */

type ActivityEvent = {
  id: number
  icon: React.ElementType
  color: string
  text: string
  time: string
}

const SAMPLE_EVENTS: Omit<ActivityEvent, 'id' | 'time'>[] = [
  { icon: Gavel, color: 'text-amber-500', text: 'New bid placed on “Office Tower — HVAC Installation”' },
  { icon: FileCheck2, color: 'text-emerald-500', text: 'Marcus H. accepted a bid from Volt Electric LLC' },
  { icon: Briefcase, color: 'text-primary', text: 'New job posted: “Restaurant Build-Out — Full Electrical”' },
  { icon: MessageSquare, color: 'text-sky-500', text: 'Ray D. sent a message about panel location' },
  { icon: Star, color: 'text-amber-400', text: 'Tasha B. left a 5-star review for Apex General' },
  { icon: CheckCircle2, color: 'text-emerald-600', text: 'Foundation & Slab job marked complete' },
  { icon: Gavel, color: 'text-amber-500', text: '3 new bids on “Multi-Family — Plumbing Trim-Out”' },
  { icon: Briefcase, color: 'text-primary', text: 'New job posted: “Warehouse — Drywall & Finish”' },
  { icon: FileCheck2, color: 'text-emerald-500', text: 'Summit Homes assigned a roofing crew' },
  { icon: Star, color: 'text-amber-400', text: 'Carla M. left a 5-star review for BuildRight Co.' },
]

const TIME_LABELS = ['just now', '12s ago', '34s ago', '1m ago', '2m ago', '3m ago', '5m ago', '7m ago']

function buildFeed(): ActivityEvent[] {
  return SAMPLE_EVENTS.slice(0, 6).map((e, i) => ({
    ...e,
    id: i,
    time: TIME_LABELS[i] ?? `${i}m ago`,
  }))
}

function LiveActivityTicker() {
  const [feed, setFeed] = useState<ActivityEvent[]>(() => buildFeed())

  useEffect(() => {
    const t = setInterval(() => {
      setFeed((prev) => {
        const [first, ...rest] = prev
        const next: ActivityEvent = {
          ...SAMPLE_EVENTS[Math.floor(Math.random() * SAMPLE_EVENTS.length)],
          id: Date.now(),
          time: 'just now',
        }
        // age the existing items
        const aged = rest.map((e, i) => ({ ...e, time: TIME_LABELS[i + 1] ?? `${i + 1}m ago` }))
        return [next, ...aged.slice(0, 5)]
      })
    }, 3500)
    return () => clearInterval(t)
  }, [])

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/80 p-0 shadow-sm backdrop-blur-sm">
      {/* gradient top accent */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-amber-400 to-primary/60" />
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <h3 className="text-sm font-bold tracking-tight">Live platform activity</h3>
          </div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Real-time</span>
        </div>
        <ul className="space-y-1">
          {feed.map((e, idx) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/40 animate-fade-in-up"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted/60 ${e.color}`}>
                <e.icon className="h-4 w-4" />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm text-foreground/90">{e.text}</p>
              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{e.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

/* ───────────── Metric card ───────────── */

function MetricCard({
  icon: Icon,
  value,
  suffix,
  label,
  trend,
  delay,
  accent,
}: {
  icon: React.ElementType
  value: number
  suffix?: string
  label: string
  trend: string
  delay: number
  accent: string
}) {
  return (
    <Card
      className="lift-card relative overflow-hidden p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full ${accent} opacity-15 blur-2xl`} />
      <div className="flex items-center justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${accent} bg-opacity-15`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="h-3 w-3" /> {trend}
        </span>
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight tabular-nums">
        <AnimatedNumber value={value} />
        {suffix}
      </p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
    </Card>
  )
}

/* ───────────── Trade distribution bar ───────────── */

const TRADE_DIST = [
  { icon: Zap, label: 'Electrical', pct: 22, color: 'bg-amber-500' },
  { icon: Droplets, label: 'Plumbing', pct: 18, color: 'bg-sky-500' },
  { icon: Hammer, label: 'Framing', pct: 15, color: 'bg-orange-500' },
  { icon: Mountain, label: 'Roofing', pct: 12, color: 'bg-rose-500' },
  { icon: Layers, label: 'Concrete', pct: 11, color: 'bg-stone-500' },
  { icon: Snowflake, label: 'HVAC', pct: 9, color: 'bg-cyan-500' },
  { icon: Paintbrush, label: 'Painting', pct: 7, color: 'bg-violet-500' },
  { icon: Wrench, label: 'Other', pct: 6, color: 'bg-emerald-500' },
]

function TradeDistribution() {
  return (
    <Card className="overflow-hidden border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-tight">Trade distribution</h3>
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Across open jobs</span>
      </div>
      {/* stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full ring-1 ring-border/60">
        {TRADE_DIST.map((t, i) => (
          <div
            key={t.label}
            className={`${t.color} h-full transition-all duration-700 hover:brightness-110`}
            style={{ width: `${t.pct}%`, animationDelay: `${i * 80}ms` }}
            title={`${t.label}: ${t.pct}%`}
          />
        ))}
      </div>
      {/* legend grid */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {TRADE_DIST.map((t, i) => (
          <div
            key={t.label}
            className="flex items-center gap-2 animate-fade-in-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${t.color}`} />
            <t.icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate text-xs font-medium text-foreground/80">{t.label}</span>
            <span className="ml-auto text-xs font-bold tabular-nums text-muted-foreground">{t.pct}%</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ───────────── Main section ───────────── */

export function PlatformPulse() {
  const [stats, setStats] = useState({
    jobs: 0,
    subcontractors: 0,
    contractors: 0,
    bids: 0,
  })

  useEffect(() => {
    api('/api/stats')
      .then((s) =>
        setStats(s as { jobs: number; subcontractors: number; contractors: number; bids: number }),
      )
      .catch(() => {})
  }, [])

  return (
    <section id="pulse" className="relative overflow-hidden border-y border-border/60 bg-muted/20">
      {/* ambient background */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        {/* heading */}
        <div className="mx-auto max-w-2xl text-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Activity className="h-3.5 w-3.5" />
            Platform pulse
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            A marketplace that <span className="text-gradient-primary">never sleeps</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Jobs posted, bids placed, and crews hired — every minute of every day. Here&apos;s what&apos;s happening on BuildUp right now.
          </p>
        </div>

        {/* metric cards */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={Gavel}
            value={stats.bids || 480}
            label="Bids placed this month"
            trend="+18%"
            delay={0}
            accent="bg-amber-500/15 text-amber-600 dark:text-amber-400"
          />
          <MetricCard
            icon={CheckCircle2}
            value={1240}
            label="Jobs completed this quarter"
            trend="+24%"
            delay={80}
            accent="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          />
          <MetricCard
            icon={Clock}
            value={3}
            suffix="h"
            label="Avg. time to first bid"
            trend="−12%"
            delay={160}
            accent="bg-sky-500/15 text-sky-600 dark:text-sky-400"
          />
          <MetricCard
            icon={Star}
            value={4}
            suffix=".8/5"
            label="Average crew rating"
            trend="+0.2"
            delay={240}
            accent="bg-amber-400/15 text-amber-500"
          />
        </div>

        {/* live activity + trade distribution */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <LiveActivityTicker />
          <TradeDistribution />
        </div>

        {/* bottom stat strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-border/60 bg-card/60 px-6 py-4 backdrop-blur-sm animate-fade-in-up">
          <BottomStat icon={Briefcase} value={stats.jobs} suffix="+" label="Open jobs" />
          <span className="hidden h-8 w-px bg-border/70 sm:block" aria-hidden />
          <BottomStat icon={HardHat} value={stats.subcontractors} suffix="+" label="Vetted subcontractors" />
          <span className="hidden h-8 w-px bg-border/70 sm:block" aria-hidden />
          <BottomStat icon={Flame} value={stats.contractors} suffix="+" label="Active contractors" />
          <span className="hidden h-8 w-px bg-border/70 sm:block" aria-hidden />
          <BottomStat icon={FileCheck2} value={98} suffix="%" label="Bid acceptance satisfaction" />
        </div>
      </div>
    </section>
  )
}

function BottomStat({
  icon: Icon,
  value,
  suffix,
  label,
}: {
  icon: React.ElementType
  value: number
  suffix?: string
  label: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary/12 to-primary/5 text-primary ring-1 ring-primary/10">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xl font-extrabold leading-none tabular-nums">
          <AnimatedNumber value={value} />
          {suffix}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
