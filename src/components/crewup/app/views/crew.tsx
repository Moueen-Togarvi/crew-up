'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StatCard } from '@/components/crewup/shared/stat-card'
import { EmptyState } from '@/components/crewup/shared/empty-state'
import { useToast } from '@/hooks/use-toast'
import {
  UserPlus,
  Pencil,
  Trash2,
  Phone,
  Mail,
  DollarSign,
  Search,
  X,
  Users,
  HardHat,
  Wrench,
  Loader2,
  ShieldCheck,
} from 'lucide-react'

/* ───────────────────────── Types ───────────────────────── */

interface CrewMember {
  id: string
  ownerUserId: string
  name: string
  role: string
  trade: string | null
  phone: string | null
  email: string | null
  hourlyRate: number | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface CrewStats {
  total: number
  active: number
  onJob: number
  unavailable: number
  avgRate: number
  byRole: Record<string, number>
}

/* ───────────────────────── Constants ───────────────────────── */

const COMMON_ROLES = [
  'Foreman',
  'Lead',
  'Apprentice',
  'Laborer',
  'Journeyman',
  'Supervisor',
] as const

type RoleFilter = 'ALL' | 'FOREMAN' | 'LEAD' | 'APPRENTICE' | 'LABORER' | 'OTHER'

const ROLE_FILTER_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: 'ALL', label: 'All roles' },
  { value: 'FOREMAN', label: 'Foreman' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'APPRENTICE', label: 'Apprentice' },
  { value: 'LABORER', label: 'Laborer' },
  { value: 'OTHER', label: 'Other' },
]

const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  ACTIVE: {
    label: 'Active',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20',
  },
  ON_JOB: {
    label: 'On job',
    dot: 'bg-amber-500',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20',
  },
  UNAVAILABLE: {
    label: 'Unavailable',
    dot: 'bg-slate-400',
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 ring-1 ring-slate-500/20',
  },
}

const FORM_ROLE_OPTIONS = [...COMMON_ROLES, 'Custom'] as const

/* ───────────────────────── Helpers ───────────────────────── */

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

function matchesRoleFilter(role: string, filter: RoleFilter): boolean {
  if (filter === 'ALL') return true
  const r = role.toLowerCase()
  if (filter === 'FOREMAN') return r.includes('foreman')
  if (filter === 'LEAD') return r.includes('lead')
  if (filter === 'APPRENTICE') return r.includes('apprentice')
  if (filter === 'LABORER') return r.includes('labor')
  // OTHER — anything that doesn't fit the named filters
  return (
    !r.includes('foreman') &&
    !r.includes('lead') &&
    !r.includes('apprentice') &&
    !r.includes('labor')
  )
}

function avatarGradient(name: string): string {
  const palettes = [
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-teal-500',
    'from-rose-400 to-pink-500',
    'from-violet-400 to-purple-500',
    'from-cyan-400 to-sky-500',
    'from-lime-400 to-green-500',
  ]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return palettes[h % palettes.length]!
}

/* ───────────────────────── Form state ───────────────────────── */

interface FormState {
  name: string
  roleSelect: string
  roleCustom: string
  trade: string
  phone: string
  email: string
  hourlyRate: string
  status: string
  notes: string
}

const EMPTY_FORM: FormState = {
  name: '',
  roleSelect: 'Foreman',
  roleCustom: '',
  trade: '',
  phone: '',
  email: '',
  hourlyRate: '',
  status: 'ACTIVE',
  notes: '',
}

function memberToForm(m: CrewMember): FormState {
  const isCommon = (COMMON_ROLES as readonly string[]).includes(m.role)
  return {
    name: m.name,
    roleSelect: isCommon ? m.role : 'Custom',
    roleCustom: isCommon ? '' : m.role,
    trade: m.trade ?? '',
    phone: m.phone ?? '',
    email: m.email ?? '',
    hourlyRate: m.hourlyRate != null ? String(m.hourlyRate) : '',
    status: m.status,
    notes: m.notes ?? '',
  }
}

function resolveRole(form: FormState): string {
  return form.roleSelect === 'Custom' ? form.roleCustom.trim() : form.roleSelect
}

/* ───────────────────────── Main view ───────────────────────── */

export function CrewView() {
  const user = useApp((s) => s.user)
  const { toast } = useToast()

  const [members, setMembers] = useState<CrewMember[]>([])
  const [stats, setStats] = useState<CrewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CrewMember | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isSubcontractor = user?.role === 'SUBCONTRACTOR'

  /* ── Data loading ───────────────────────────────────────── */
  const loadMembers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<{ members: CrewMember[] }>('/api/crew')
      setMembers(res.members)
    } catch (e) {
      toast({
        title: 'Failed to load crew',
        description: (e as Error).message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await api<CrewStats>('/api/crew/stats')
      setStats(res)
    } catch {
      // non-fatal — stats are best-effort
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isSubcontractor) return
    void loadMembers()
    void loadStats()
  }, [isSubcontractor, loadMembers, loadStats])

  /* ── Filtering ──────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members.filter((m) => {
      if (!matchesRoleFilter(m.role, roleFilter)) return false
      if (!q) return true
      return [m.name, m.role, m.trade ?? '']
        .map((s) => s.toLowerCase())
        .some((s) => s.includes(q))
    })
  }, [members, query, roleFilter])

  const searching = query.trim().length > 0 || roleFilter !== 'ALL'

  /* ── Dialog handlers ────────────────────────────────────── */
  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (m: CrewMember) => {
    setEditing(m)
    setForm(memberToForm(m))
    setDialogOpen(true)
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handleSave = async () => {
    const role = resolveRole(form)
    if (!form.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' })
      return
    }
    if (!role) {
      toast({ title: 'Role is required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      if (editing) {
        const res = await api<{ member: CrewMember }>(`/api/crew/${editing.id}`, {
          method: 'PATCH',
          body: {
            name: form.name.trim(),
            role,
            trade: form.trade.trim() || null,
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            hourlyRate: form.hourlyRate === '' ? null : Number(form.hourlyRate),
            status: form.status,
            notes: form.notes.trim() || null,
          },
        })
        setMembers((arr) => arr.map((m) => (m.id === editing.id ? res.member : m)))
        toast({ title: 'Crew member updated', description: res.member.name })
      } else {
        const res = await api<{ member: CrewMember }>('/api/crew', {
          method: 'POST',
          body: {
            name: form.name.trim(),
            role,
            trade: form.trade.trim() || null,
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            hourlyRate: form.hourlyRate === '' ? null : Number(form.hourlyRate),
            notes: form.notes.trim() || null,
          },
        })
        setMembers((arr) => [...arr, res.member])
        toast({ title: 'Crew member added', description: res.member.name })
      }
      setDialogOpen(false)
      void loadStats()
    } catch (e) {
      toast({
        title: editing ? 'Failed to update member' : 'Failed to add member',
        description: (e as Error).message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  /* ── Delete (optimistic) ────────────────────────────────── */
  const handleConfirmDelete = async () => {
    const id = confirmId
    if (!id) return
    setConfirmId(null)

    const snapshot = members
    setMembers((arr) => arr.filter((m) => m.id !== id))
    setDeletingId(id)

    try {
      await api(`/api/crew/${id}`, { method: 'DELETE' })
      toast({ title: 'Crew member removed' })
      void loadStats()
    } catch (e) {
      setMembers(snapshot)
      toast({
        title: 'Failed to remove member',
        description: (e as Error).message,
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  /* ── Render: contractor guard ───────────────────────────── */
  if (!isSubcontractor) {
    return (
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-amber-400/5 p-5">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              <HardHat className="h-6 w-6 text-primary" /> My Crew
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your team members, roles, and availability.
            </p>
          </div>
        </div>
        <EmptyState
          icon={HardHat}
          title="Crew management is available for subcontractor accounts"
          description="Switch to a subcontractor account to add and manage your foreman, apprentices, lead workers, and laborers."
          accentClassName="text-primary"
        />
      </div>
    )
  }

  /* ── Render: main ───────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-primary/5 via-card to-amber-400/5 p-5">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight">
              <HardHat className="h-6 w-6 text-primary" /> My Crew
              <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs">
                <Users className="h-3 w-3" />
                {stats?.total ?? 0}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your team members, roles, and availability.
            </p>
          </div>
          <Button className="sweep-on-hover gap-1.5" onClick={openAdd}>
            <UserPlus className="h-4 w-4" /> Add member
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total members"
          value={stats?.total ?? 0}
          loading={statsLoading}
          accent="text-primary"
          chipGradient="from-primary/15 to-primary/5"
        />
        <StatCard
          icon={ShieldCheck}
          label="Active"
          value={stats?.active ?? 0}
          sublabel={stats ? `${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% of crew` : undefined}
          loading={statsLoading}
          accent="text-emerald-600 dark:text-emerald-400"
          chipGradient="from-emerald-500/15 to-emerald-500/5"
        />
        <StatCard
          icon={Wrench}
          label="On job"
          value={stats?.onJob ?? 0}
          loading={statsLoading}
          accent="text-amber-600 dark:text-amber-400"
          chipGradient="from-amber-500/15 to-amber-500/5"
        />
        <StatCard
          icon={DollarSign}
          label="Avg hourly rate"
          value={stats && stats.avgRate > 0 ? `$${stats.avgRate.toFixed(2)}` : '—'}
          loading={statsLoading}
          accent="text-primary"
          chipGradient="from-amber-400/15 to-amber-400/5"
        />
      </div>

      {/* Toolbar */}
      {!loading && members.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, role, or trade…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-9"
              aria-label="Search crew"
            />
            {searching && (
              <button
                onClick={() => {
                  setQuery('')
                  setRoleFilter('ALL')
                }}
                aria-label="Clear search"
                title="Clear search"
                className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select
            value={roleFilter}
            onValueChange={(v) => setRoleFilter(v as RoleFilter)}
          >
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Result count */}
      {!loading && members.length > 0 && (
        <p className="text-xs font-medium text-muted-foreground">
          {searching
            ? `Showing ${filtered.length} of ${members.length} members`
            : `${members.length} ${members.length === 1 ? 'member' : 'members'}`}
        </p>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CrewSkeletonCard key={i} />
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="Build your crew"
          description="Add your foreman, lead workers, apprentices, and laborers to track their roles, contact info, and availability."
          actionLabel="Add your first crew member"
          onAction={openAdd}
          accentClassName="text-primary"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={`No matches for “${query}”`}
          description="Try a different keyword or clear your filters to see your whole crew."
          actionLabel="Clear filters"
          onAction={() => {
            setQuery('')
            setRoleFilter('ALL')
          }}
          accentClassName="text-amber-500"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m, idx) => (
            <CrewMemberCard
              key={m.id}
              member={m}
              index={idx}
              deleting={deletingId === m.id}
              onEdit={() => openEdit(m)}
              onDelete={() => setConfirmId(m.id)}
            />
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-primary" />
              {editing ? 'Edit crew member' : 'Add crew member'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update this team member’s details and availability.'
                : 'Add a new team member to your crew.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="crew-name">Name *</Label>
              <Input
                id="crew-name"
                placeholder="e.g. Marcus Reilly"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="crew-role">Role *</Label>
              <Select
                value={form.roleSelect}
                onValueChange={(v) => update('roleSelect', v)}
              >
                <SelectTrigger id="crew-role" aria-label="Role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORM_ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.roleSelect === 'Custom' && (
                <Input
                  placeholder="Enter custom role (e.g. Lead Electrician)"
                  value={form.roleCustom}
                  onChange={(e) => update('roleCustom', e.target.value)}
                  maxLength={100}
                  aria-label="Custom role"
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="crew-trade">Trade (optional)</Label>
              <Input
                id="crew-trade"
                placeholder="e.g. Electrical, Plumbing"
                value={form.trade}
                onChange={(e) => update('trade', e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="crew-phone">Phone (optional)</Label>
                <Input
                  id="crew-phone"
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  maxLength={40}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="crew-email">Email (optional)</Label>
                <Input
                  id="crew-email"
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  maxLength={120}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="crew-rate">Hourly rate (optional)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="crew-rate"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    value={form.hourlyRate}
                    onChange={(e) => update('hourlyRate', e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="crew-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => update('status', v)}
                >
                  <SelectTrigger id="crew-status" aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ON_JOB">On job</SelectItem>
                    <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="crew-notes">Notes (optional)</Label>
              <Textarea
                id="crew-notes"
                placeholder="Certifications, experience, scheduling notes…"
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="sweep-on-hover gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Add member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={confirmId !== null} onOpenChange={(o) => { if (!o) setConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this crew member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{' '}
              <span className="font-semibold text-foreground">
                {members.find((m) => m.id === confirmId)?.name ?? 'this member'}
              </span>{' '}
              from your crew. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ───────────────────────── Crew member card ───────────────────────── */

function CrewMemberCard({
  member,
  index,
  deleting,
  onEdit,
  onDelete,
}: {
  member: CrewMember
  index: number
  deleting: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const status = STATUS_META[member.status] ?? STATUS_META.ACTIVE!

  return (
    <Card
      className={cn(
        'lift-card relative animate-stagger-in overflow-hidden p-0 transition-opacity',
        deleting && 'opacity-50',
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Top accent gradient bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-primary to-amber-400" />

      <div className="p-5">
        {/* Header: avatar + name + status */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ring-2 ring-background',
              avatarGradient(member.name),
            )}
            aria-hidden
          >
            {getInitials(member.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold leading-tight">{member.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="px-2 py-0 text-xs font-semibold">
                    {member.role}
                  </Badge>
                  {member.trade && (
                    <Badge variant="outline" className="px-2 py-0 text-xs text-muted-foreground">
                      {member.trade}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="mt-4 space-y-1.5 text-sm">
          {member.phone && (
            <a
              href={`tel:${member.phone}`}
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{member.phone}</span>
            </a>
          )}
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{member.email}</span>
            </a>
          )}
          {member.hourlyRate != null && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-foreground">
                {member.hourlyRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / hr
              </span>
            </div>
          )}
          {!member.phone && !member.email && member.hourlyRate == null && (
            <p className="text-xs italic text-muted-foreground/70">No contact info on file</p>
          )}
        </div>

        {/* Notes (if present) */}
        {member.notes && (
          <p className="mt-3 line-clamp-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
            {member.notes}
          </p>
        )}

        {/* Status indicator + actions */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
              status.badge,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
            {status.label}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-8 gap-1 px-2" onClick={onEdit} aria-label={`Edit ${member.name}`}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:text-xs">Edit</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
              aria-label={`Remove ${member.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:text-xs">Delete</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

/* ───────────────────────── Skeleton ───────────────────────── */

function CrewSkeletonCard() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="h-1.5 w-full shimmer" />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 rounded-full shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded shimmer" />
            <div className="flex gap-1.5">
              <div className="h-5 w-16 rounded-full shimmer" />
              <div className="h-5 w-20 rounded-full shimmer" />
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="h-3 w-1/2 rounded shimmer" />
          <div className="h-3 w-2/3 rounded shimmer" />
          <div className="h-3 w-1/3 rounded shimmer" />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div className="h-5 w-20 rounded-full shimmer" />
          <div className="flex gap-1">
            <div className="h-8 w-12 rounded-md shimmer" />
            <div className="h-8 w-12 rounded-md shimmer" />
          </div>
        </div>
      </div>
    </Card>
  )
}
