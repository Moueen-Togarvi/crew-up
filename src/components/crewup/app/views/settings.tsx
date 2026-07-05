'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import { TRADES, US_STATES } from '@/lib/constants'
import type { PublicUser } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  User as UserIcon,
  Building2,
  Phone,
  MapPin,
  Image as ImageIcon,
  FileText,
  Wrench,
  DollarSign,
  Palette,
  Bell,
  Shield,
  LogOut,
  Save,
  Loader2,
  Check,
  Sun,
  Moon,
  Monitor,
  Mail,
  Lock,
  Trash2,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { useTheme } from 'next-themes'

/* ───────────────────────── Section wrapper ───────────────────────── */

function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
  accent = 'bg-primary/10 text-primary',
  delay = 0,
}: {
  id?: string
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
  accent?: string
  delay?: number
}) {
  return (
    <Card
      id={id}
      className="scroll-mt-24 overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="h-1 w-full bg-gradient-to-r from-primary to-amber-400" />
      <div className="p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', accent)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight">{title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </Card>
  )
}

/* ───────────────────────── Field primitives ───────────────────────── */

function FieldRow({
  label,
  htmlFor,
  icon: Icon,
  children,
  hint,
}: {
  label: string
  htmlFor?: string
  icon: React.ElementType
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </Label>
      </div>
      <div>
        {children}
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}

const inputCls = 'h-10'

/* ───────────────────────── Main view ───────────────────────── */

export function SettingsView() {
  const user = useApp((s) => s.user)
  const refreshUser = useApp((s) => s.refreshUser)
  const logout = useApp((s) => s.logout)
  const setView = useApp((s) => s.setView)
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  // Form state — initialized from the current user
  const [form, setForm] = useState({
    name: '',
    company: '',
    phone: '',
    city: '',
    state: '',
    avatarUrl: '',
    bio: '',
    trade: '',
    skills: '',
    hourlyRate: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Notification preferences (local-only demo; persisted to localStorage)
  const [notifPrefs, setNotifPrefs] = useState({
    newBids: true,
    bidUpdates: true,
    messages: true,
    reviews: true,
    marketing: false,
  })

  // Danger-zone confirm state
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!user) return
    setForm({
      name: user.name || '',
      company: user.company || '',
      phone: user.phone || '',
      city: user.city || '',
      state: user.state || '',
      avatarUrl: user.avatarUrl || '',
      bio: user.bio || '',
      trade: user.trade || '',
      skills: user.skills || '',
      hourlyRate: user.hourlyRate ? String(user.hourlyRate) : '',
    })
  }, [user])

  // Load notification prefs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('buildup_notif_prefs')
      if (stored) setNotifPrefs(JSON.parse(stored))
    } catch {
      /* ignore */
    }
  }, [])

  // Persist notif prefs
  useEffect(() => {
    try {
      localStorage.setItem('buildup_notif_prefs', JSON.stringify(notifPrefs))
    } catch {
      /* ignore */
    }
  }, [notifPrefs])

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isSubcontractor = user.role === 'SUBCONTRACTOR'

  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        company: form.company.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        avatarUrl: form.avatarUrl.trim(),
        bio: form.bio.trim(),
      }
      if (isSubcontractor) {
        payload.trade = form.trade
        payload.skills = form.skills.trim()
        payload.hourlyRate = form.hourlyRate ? Number(form.hourlyRate) : null
      }
      const { user: updated } = await api<{ user: PublicUser }>('/api/user/profile', {
        method: 'PATCH',
        body: payload,
      })
      // refreshUser will pull the canonical version via /api/auth/me
      await refreshUser()
      // but also set directly in case refreshUser is lazy
      void updated
      setSaved(true)
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' })
    } catch (e) {
      toast({
        title: 'Could not save',
        description: e instanceof Error ? e.message : 'Something went wrong.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleNotifToggle = (key: keyof typeof notifPrefs) => {
    setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))
    toast({ title: 'Preference updated' })
  }

  const handleDeleteAccount = () => {
    // Demo only — just log out. Real deletion would call a DELETE /api/user endpoint.
    toast({
      title: 'Account deletion',
      description: 'This is a demo — your account has not been deleted. You have been logged out.',
      variant: 'destructive',
    })
    void logout()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account, appearance, and notification preferences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 animate-fade-in">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
          <Button onClick={handleSave} disabled={saving} className="sweep-on-hover">
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </div>

      {/* Quick nav chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'profile', label: 'Profile', icon: UserIcon },
          { id: 'appearance', label: 'Appearance', icon: Palette },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'security', label: 'Security', icon: Shield },
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => {
              const el = document.getElementById(chip.id)
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <chip.icon className="h-3.5 w-3.5" />
            {chip.label}
          </button>
        ))}
      </div>

      {/* ───────────── Profile section ───────────── */}
      <SettingsSection
        id="profile"
        icon={UserIcon}
        title="Profile information"
        description="Update how you appear to others on BuildUp."
        delay={0}
      >
        {/* Avatar preview + URL */}
        <div className="mb-5 flex flex-col gap-4 rounded-xl border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center">
          <UserAvatar user={{ ...user, avatarUrl: form.avatarUrl || null }} className="h-16 w-16 ring-2 ring-primary/20 ring-offset-2 ring-offset-card" />
          <div className="flex-1">
            <Label htmlFor="avatarUrl" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" /> Avatar URL
            </Label>
            <Input
              id="avatarUrl"
              value={form.avatarUrl}
              onChange={(e) => set('avatarUrl', e.target.value)}
              placeholder="https://…/avatar.png"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-muted-foreground">Paste a public image URL. Square images work best.</p>
          </div>
        </div>

        <div className="space-y-4">
          <FieldRow label="Full name" htmlFor="name" icon={UserIcon}>
            <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="Your name" />
          </FieldRow>
          <Separator />
          <FieldRow label="Company" htmlFor="company" icon={Building2}>
            <Input id="company" value={form.company} onChange={(e) => set('company', e.target.value)} className={inputCls} placeholder="Company name" />
          </FieldRow>
          <Separator />
          <FieldRow label="Phone" htmlFor="phone" icon={Phone}>
            <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} placeholder="(555) 000-0000" />
          </FieldRow>
          <Separator />
          <FieldRow label="City" htmlFor="city" icon={MapPin}>
            <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} className={inputCls} placeholder="Austin" />
          </FieldRow>
          <Separator />
          <FieldRow label="State" htmlFor="state" icon={MapPin}>
            <Select value={form.state || 'ALL'} onValueChange={(v) => set('state', v === 'ALL' ? '' : v)}>
              <SelectTrigger className={cn(inputCls, 'w-full sm:w-[180px]')}>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="ALL">— None —</SelectItem>
                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldRow>
          <Separator />
          <FieldRow label="Bio" htmlFor="bio" icon={FileText} hint={`${form.bio.length} / 1000 characters`}>
            <Textarea
              id="bio"
              value={form.bio}
              onChange={(e) => set('bio', e.target.value.slice(0, 1000))}
              rows={4}
              placeholder="Tell contractors or crews about your experience, specialties, and what makes you stand out."
            />
          </FieldRow>

          {/* Subcontractor-only fields */}
          {isSubcontractor && (
            <>
              <Separator />
              <FieldRow label="Trade" htmlFor="trade" icon={Wrench}>
                <Select value={form.trade || 'ALL'} onValueChange={(v) => set('trade', v === 'ALL' ? '' : v)}>
                  <SelectTrigger className={cn(inputCls, 'w-full sm:w-[200px]')}>
                    <SelectValue placeholder="Select trade" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="ALL">— None —</SelectItem>
                    {TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldRow>
              <Separator />
              <FieldRow label="Skills" htmlFor="skills" icon={Sparkles} hint="Comma-separated, e.g. “Panel upgrades, LED retrofits, troubleshooting”">
                <Input id="skills" value={form.skills} onChange={(e) => set('skills', e.target.value)} className={inputCls} placeholder="Skill 1, Skill 2, Skill 3" />
              </FieldRow>
              <Separator />
              <FieldRow label="Hourly rate (USD)" htmlFor="hourlyRate" icon={DollarSign}>
                <Input
                  id="hourlyRate"
                  type="number"
                  min="0"
                  step="1"
                  value={form.hourlyRate}
                  onChange={(e) => set('hourlyRate', e.target.value)}
                  className={cn(inputCls, 'w-full sm:w-[140px]')}
                  placeholder="85"
                />
              </FieldRow>
            </>
          )}
        </div>
      </SettingsSection>

      {/* ───────────── Appearance section ───────────── */}
      <SettingsSection
        id="appearance"
        icon={Palette}
        title="Appearance"
        description="Choose how BuildUp looks on this device."
        accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        delay={60}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { value: 'light', label: 'Light', icon: Sun, desc: 'Bright & clear' },
            { value: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
            { value: 'system', label: 'System', icon: Monitor, desc: 'Follow device' },
          ].map((opt) => {
            const active = theme === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  'group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all',
                  active
                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                    : 'border-border bg-card hover:border-primary/30 hover:bg-accent/30',
                )}
              >
                <span className={cn(
                  'grid h-9 w-9 place-items-center rounded-lg transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:text-foreground',
                )}>
                  <opt.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                {active && (
                  <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </SettingsSection>

      {/* ───────────── Notifications section ───────────── */}
      <SettingsSection
        id="notifications"
        icon={Bell}
        title="Notification preferences"
        description="Choose which events trigger a notification."
        accent="bg-amber-400/10 text-amber-600 dark:text-amber-400"
        delay={120}
      >
        <div className="space-y-1">
          {[
            { key: 'newBids' as const, label: 'New bids on your jobs', desc: 'When someone submits a bid on a job you posted.' },
            { key: 'bidUpdates' as const, label: 'Bid status updates', desc: 'When a bid you submitted is accepted or rejected.' },
            { key: 'messages' as const, label: 'New messages', desc: 'When you receive a new message in a conversation.' },
            { key: 'reviews' as const, label: 'New reviews', desc: 'When someone leaves you a review.' },
            { key: 'marketing' as const, label: 'Product & tips', desc: 'Occasional emails with new features and best practices.' },
          ].map((item, idx) => (
            <div key={item.key}>
              {idx > 0 && <Separator />}
              <div className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={notifPrefs[item.key]}
                  onCheckedChange={() => handleNotifToggle(item.key)}
                  aria-label={item.label}
                />
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* ───────────── Security / Account section ───────────── */}
      <SettingsSection
        id="security"
        icon={Shield}
        title="Account & security"
        description="Manage your sign-in credentials and account."
        accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        delay={180}
      >
        <div className="space-y-3">
          {/* Email (read-only) */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Mail className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email address</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" /> Verified
            </Badge>
          </div>

          {/* Password (demo) */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Lock className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Password</p>
                <p className="text-sm font-medium">••••••••••</p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>
              Change
            </Button>
          </div>

          {/* Plan */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current plan</p>
                <p className="text-sm font-medium">BuildUp {user.plan}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setView('billing')}>
              Manage <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Sessions / Sign out */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                <LogOut className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Session</p>
                <p className="text-sm font-medium">Sign out of this device</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* ───────────── Danger zone ───────────── */}
      <Card className="overflow-hidden border-rose-300/50 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
        <div className="h-1 w-full bg-gradient-to-r from-rose-500 to-rose-400" />
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Trash2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight text-rose-700 dark:text-rose-400">Danger zone</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Irreversible actions. Please proceed with caution.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-rose-200/60 bg-rose-50/40 p-4 dark:border-rose-900/40 dark:bg-rose-950/20 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">Delete this account</p>
              <p className="text-xs text-muted-foreground">
                Permanently remove your profile, jobs, bids, and messages. This cannot be undone.
              </p>
            </div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Confirm delete
                </Button>
              </div>
            ) : (
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete account
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Footer hint */}
      <p className="pb-4 text-center text-xs text-muted-foreground">
        Settings are saved per device. Need help? <button onClick={() => setView('billing')} className="font-medium text-primary hover:underline">Contact support</button>.
      </p>
    </div>
  )
}
