'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import { TRADES, US_STATES } from '@/lib/constants'
import type { PublicUser } from '@/lib/constants'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  HardHat,
  Wrench,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  User as UserIcon,
  Building2,
  MapPin,
  FileText,
  Sparkles,
  DollarSign,
  Rocket,
  X,
  Star,
  Briefcase,
  Target,
  CheckCircle2,
} from 'lucide-react'

interface OnboardingData {
  avatarUrl: string
  bio: string
  company: string
  phone: string
  city: string
  state: string
  trade: string
  skills: string
  hourlyRate: string
}

const SKILL_SUGGESTIONS: Record<string, string[]> = {
  Electrical: ['Panel upgrades', 'Wiring', 'Lighting', 'Inspections', 'EV chargers', 'Troubleshooting'],
  Plumbing: ['Rough-in', 'Fixtures', 'Drain cleaning', 'Water heaters', 'Repiping', 'Backflow'],
  Framing: ['Wood framing', 'Steel framing', 'Trusses', 'Decking', 'Sheathing', 'Layout'],
  Roofing: ['Shingle', 'Metal', 'Flat roofs', 'Repairs', 'Gutters', 'Underlayment'],
  Concrete: ['Flatwork', 'Foundations', 'Stamping', 'Polishing', 'Pumping', 'Finishing'],
  HVAC: ['Installation', 'Service', 'Ductwork', 'Mini-splits', 'Refrigeration', 'Controls'],
  Drywall: ['Hanging', 'Taping', 'Finishing', 'Texture', 'Repairs', 'Scaffolding'],
  Painting: ['Interior', 'Exterior', 'Spray', 'Brush & roll', 'Staining', 'Prep'],
}

const TOTAL_STEPS = 4

export function OnboardingWizard({
  open,
  onOpenChange,
  user,
  onCompleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: PublicUser
  onCompleted?: () => void
}) {
  const { toast } = useToast()
  const refreshUser = useApp((s) => s.refreshUser)
  const isSubcontractor = user.role === 'SUBCONTRACTOR'

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    avatarUrl: user.avatarUrl || '',
    bio: user.bio || '',
    company: user.company || '',
    phone: user.phone || '',
    city: user.city || '',
    state: user.state || '',
    trade: user.trade || '',
    skills: user.skills || '',
    hourlyRate: user.hourlyRate ? String(user.hourlyRate) : '',
  })

  const set = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData((d) => ({ ...d, [key]: value }))
  }

  const toggleSkill = (skill: string) => {
    const current = data.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (current.includes(skill)) {
      set('skills', current.filter((s) => s !== skill).join(', '))
    } else {
      set('skills', [...current, skill].join(', '))
    }
  }

  const selectedSkills = data.skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const canProceed = () => {
    if (step === 0) return true // welcome
    if (step === 1) return data.city.trim().length > 0 || data.state.length > 0 // location (optional but encouraged)
    if (step === 2) {
      if (isSubcontractor) return data.trade.length > 0
      return data.company.trim().length > 0
    }
    if (step === 3) return true // bio (optional)
    return true
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        avatarUrl: data.avatarUrl.trim(),
        bio: data.bio.trim(),
        company: data.company.trim(),
        phone: data.phone.trim(),
        city: data.city.trim(),
        state: data.state,
      }
      if (isSubcontractor) {
        payload.trade = data.trade
        payload.skills = data.skills.trim()
        payload.hourlyRate = data.hourlyRate ? Number(data.hourlyRate) : null
      }
      await api('/api/user/profile', { method: 'PATCH', body: payload })
      await refreshUser()
      toast({ title: 'Profile complete! 🎉', description: 'Your BuildUp profile is ready.' })
      onOpenChange(false)
      onCompleted?.()
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

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1)
    else handleFinish()
  }

  const back = () => {
    if (step > 0) setStep((s) => s - 1)
  }

  const skip = () => {
    onOpenChange(false)
    toast({ title: 'Skipped for now', description: 'You can complete your profile anytime in Settings.' })
    onCompleted?.()
  }

  const skillSuggestions = data.trade ? SKILL_SUGGESTIONS[data.trade] || [] : []

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) skip(); else onOpenChange(o) }}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
        {/* Gradient header bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-amber-400 to-primary/60" />

        {/* Close button (top-right, allows skip) */}
        <button
          onClick={skip}
          disabled={saving}
          aria-label="Skip onboarding"
          className="absolute right-4 top-5 z-10 grid h-8 w-8 place-items-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress bar */}
        <div className="px-6 pt-6 sm:px-8">
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all duration-300',
                  i < step ? 'bg-primary' : i === step ? 'bg-primary/60' : 'bg-muted',
                )}
              />
            ))}
          </div>
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            Step {step + 1} of {TOTAL_STEPS}
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 pb-2 sm:px-8">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="py-4 text-center animate-fade-in-up">
              <div className="relative mx-auto w-fit">
                <div className="absolute -inset-4 rounded-full bg-primary/10 blur-xl" />
                <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-amber-500 text-primary-foreground shadow-lg">
                  <Rocket className="h-8 w-8" />
                </span>
              </div>
              <DialogTitle className="mt-5 text-2xl font-extrabold tracking-tight">
                Welcome to BuildUp{user.name ? `, ${user.name.split(' ')[0]}` : ''}!
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm">
                Let&apos;s set up your profile so you can start {isSubcontractor ? 'finding work' : 'hiring crews'}.
                This takes about 2 minutes.
              </DialogDescription>

              {/* What you'll get */}
              <div className="mt-6 space-y-2 text-left">
                {[
                  { icon: UserIcon, text: 'Complete your profile so others can find you' },
                  { icon: Target, text: `Set your ${isSubcontractor ? 'trade and skills' : 'company details'}` },
                  { icon: Star, text: 'Start building your reputation on BuildUp' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 animate-fade-in-up"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm text-foreground/90">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Location & contact */}
          {step === 1 && (
            <div className="py-4 animate-fade-in-up">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <MapPin className="h-5 w-5 text-primary" /> Where are you based?
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                Your location helps match you with {isSubcontractor ? 'nearby jobs' : 'local crews'}.
              </DialogDescription>

              <div className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">City</Label>
                    <Input
                      value={data.city}
                      onChange={(e) => set('city', e.target.value)}
                      placeholder="Austin"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">State</Label>
                    <Select value={data.state || 'ALL'} onValueChange={(v) => set('state', v === 'ALL' ? '' : v)}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="ALL">— None —</SelectItem>
                        {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Phone (optional)</Label>
                  <Input
                    value={data.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="(555) 000-0000"
                    className="h-10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Role-specific details */}
          {step === 2 && (
            <div className="py-4 animate-fade-in-up">
              {isSubcontractor ? (
                <>
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                    <Wrench className="h-5 w-5 text-primary" /> Your trade & skills
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm">
                    Tell us what you do so we can match you with the right jobs.
                  </DialogDescription>

                  <div className="mt-5 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Primary trade *</Label>
                      <Select value={data.trade || 'ALL'} onValueChange={(v) => { set('trade', v === 'ALL' ? '' : v); set('skills', '') }}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select your trade" /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          <SelectItem value="ALL">— None —</SelectItem>
                          {TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {skillSuggestions.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Skills (tap to add)</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {skillSuggestions.map((skill) => {
                            const selected = selectedSkills.includes(skill)
                            return (
                              <button
                                key={skill}
                                type="button"
                                onClick={() => toggleSkill(skill)}
                                className={cn(
                                  'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                                  selected
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-card hover:border-primary/40 hover:bg-accent/40',
                                )}
                              >
                                {selected && <Check className="mr-1 inline h-3 w-3" />}
                                {skill}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Custom skills (comma-separated)</Label>
                      <Input
                        value={data.skills}
                        onChange={(e) => set('skills', e.target.value)}
                        placeholder="e.g. Solar installation, Generators"
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Hourly rate (USD, optional)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={data.hourlyRate}
                          onChange={(e) => set('hourlyRate', e.target.value)}
                          placeholder="85"
                          className="h-10 pl-9"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                    <Building2 className="h-5 w-5 text-primary" /> Company details
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm">
                    Help subcontractors learn about your company.
                  </DialogDescription>

                  <div className="mt-5 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Company name *</Label>
                      <Input
                        value={data.company}
                        onChange={(e) => set('company', e.target.value)}
                        placeholder="BuildRight Construction Co."
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Phone</Label>
                      <Input
                        value={data.phone}
                        onChange={(e) => set('phone', e.target.value)}
                        placeholder="(555) 000-0000"
                        className="h-10"
                      />
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">
                        <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" />
                        Tip: A complete company profile attracts 3x more bids on your jobs.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Bio & avatar */}
          {step === 3 && (
            <div className="py-4 animate-fade-in-up">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <FileText className="h-5 w-5 text-primary" /> Tell your story
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                A good bio helps you stand out. You can always edit this later.
              </DialogDescription>

              <div className="mt-5 space-y-4">
                {/* Avatar preview + URL */}
                <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                  <UserAvatar
                    user={{ ...user, avatarUrl: data.avatarUrl || null }}
                    className="h-16 w-16 ring-2 ring-primary/20 ring-offset-2 ring-offset-card"
                  />
                  <div className="flex-1">
                    <Label className="mb-1.5 block text-xs font-semibold">Avatar URL (optional)</Label>
                    <Input
                      value={data.avatarUrl}
                      onChange={(e) => set('avatarUrl', e.target.value)}
                      placeholder="https://…/avatar.png"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bio</Label>
                  <Textarea
                    value={data.bio}
                    onChange={(e) => set('bio', e.target.value.slice(0, 1000))}
                    rows={5}
                    placeholder={
                      isSubcontractor
                        ? '15+ years specializing in commercial electrical. Licensed and insured. Available for large-scale projects...'
                        : 'General contractor specializing in commercial builds across central Texas. 15+ years running crews...'
                    }
                  />
                  <p className="text-right text-xs text-muted-foreground">{data.bio.length} / 1000</p>
                </div>

                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> Almost done! Click finish to save your profile.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer: Back / Next / Skip */}
        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-6 py-4 sm:px-8">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={back} disabled={saving}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={skip} disabled={saving}>
              Skip
            </Button>
          )}

          <div className="flex items-center gap-2">
            {step < TOTAL_STEPS - 1 && (
              <span className="hidden text-xs text-muted-foreground sm:block">
                {canProceed() ? 'Looks good!' : 'Fill in the required fields'}
              </span>
            )}
            <Button onClick={next} disabled={!canProceed() || saving} className="sweep-on-hover">
              {saving ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…</>
              ) : step === TOTAL_STEPS - 1 ? (
                <><Check className="mr-1.5 h-4 w-4" /> Finish</>
              ) : step === 0 ? (
                <>Let&apos;s go <ArrowRight className="ml-1.5 h-4 w-4" /></>
              ) : (
                <>Continue <ArrowRight className="ml-1.5 h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
