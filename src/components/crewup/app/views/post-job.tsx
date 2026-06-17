'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import type { JobWithRelations } from '@/lib/constants'
import { TRADES, CATEGORIES, URGENCY, US_STATES } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { TradeBadge, UrgencyBadge } from '@/components/crewup/shared/badges'
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { formatMoney } from '@/components/crewup/shared/format'
import { ArrowLeft, FilePlus2, Loader2, DollarSign, MapPin, Clock, Users, AlertTriangle, CheckCircle2, Eye, Sparkles, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PostJobView() {
  const user = useApp((s) => s.user)!
  const setView = useApp((s) => s.setView)
  const openJob = useApp((s) => s.openJob)
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', trade: '', category: 'General',
    budgetMin: '', budgetMax: '', location: '', city: '', state: '',
    duration: '', crewSize: '1', urgency: 'STANDARD',
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const requiredFields = ['title', 'description', 'trade', 'location', 'budgetMin', 'budgetMax']
  const filledRequired = requiredFields.filter((k) => form[k as keyof typeof form].trim() !== '').length
  const completionPct = Math.round((filledRequired / requiredFields.length) * 100)
  const budgetValid = form.budgetMin && form.budgetMax && Number(form.budgetMax) >= Number(form.budgetMin)
  const canSubmit = filledRequired === requiredFields.length && budgetValid

  const submit = async () => {
    if (!canSubmit) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' })
      return
    }
    if (!budgetValid) {
      toast({ title: 'Max budget must be greater than min budget', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const { job } = await api<{ job: JobWithRelations }>('/api/jobs', { method: 'POST', body: form })
      toast({ title: 'Job posted!', description: 'Your job is now live in the marketplace.' })
      openJob(job.id)
    } catch (e) {
      toast({ title: 'Failed to post job', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <button onClick={() => setView('dashboard')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Post a job</h1>
          <p className="text-sm text-muted-foreground">Reach vetted subcontractors across the country. Most jobs receive bids within 24 hours.</p>
        </div>
        {/* Completion progress */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <div className="relative h-8 w-8">
            <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
              <circle
                cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3"
                className="text-primary transition-all duration-500"
                strokeDasharray={`${(completionPct / 100) * 81.68} 81.68`}
                strokeLinecap="round"
              />
            </svg>
            <span className={cn(
              'absolute inset-0 grid place-items-center text-[10px] font-bold',
              completionPct === 100 ? 'text-emerald-500' : 'text-muted-foreground'
            )}>
              {completionPct === 100 ? <CheckCircle2 className="h-3.5 w-3.5" /> : `${completionPct}%`}
            </span>
          </div>
          <div className="text-xs">
            <p className="font-semibold">{filledRequired}/{requiredFields.length} required</p>
            <p className="text-muted-foreground">{completionPct === 100 ? 'Ready to post!' : 'Keep going…'}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Form column */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            <div className="space-y-6">
              {/* Section: Basics */}
              <FormSection step={1} title="Job basics" hint="What needs doing?">
                <div className="space-y-1.5">
                  <Label>Job title <span className="text-destructive">*</span></Label>
                  <Input placeholder="e.g. Commercial Office Build-Out — Electrical" value={form.title} onChange={(e) => set('title', e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Description <span className="text-destructive">*</span></Label>
                  <Textarea
                    placeholder="Describe the scope of work, materials, site access, inspections, and anything a subcontractor needs to know to bid accurately."
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    rows={6}
                  />
                  <p className="text-[11px] text-muted-foreground">{form.description.length} characters · detailed descriptions get 3x more bids</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Trade <span className="text-destructive">*</span></Label>
                    <Select value={form.trade} onValueChange={(v) => set('trade', v)}>
                      <SelectTrigger><SelectValue placeholder="Select trade" /></SelectTrigger>
                      <SelectContent className="max-h-72">{TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => set('category', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </FormSection>

              <div className="border-t border-border" />

              {/* Section: Budget & timeline */}
              <FormSection step={2} title="Budget & timeline" hint="Be transparent — accurate budgets attract better bids">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Minimum budget (USD) <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="number" placeholder="28000" value={form.budgetMin} onChange={(e) => set('budgetMin', e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Maximum budget (USD) <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="number" placeholder="42000" value={form.budgetMax} onChange={(e) => set('budgetMax', e.target.value)} className="pl-9" />
                    </div>
                    {form.budgetMin && form.budgetMax && !budgetValid && (
                      <p className="text-[11px] font-medium text-rose-500">Max must be ≥ min budget</p>
                    )}
                    {form.budgetMin && form.budgetMax && budgetValid && (
                      <p className="text-[11px] font-medium text-emerald-600">✓ Valid range ({formatMoney(Number(form.budgetMin))}–{formatMoney(Number(form.budgetMax))})</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Estimated duration</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="3-4 weeks" value={form.duration} onChange={(e) => set('duration', e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Crew size needed</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="number" min="1" placeholder="4" value={form.crewSize} onChange={(e) => set('crewSize', e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Urgency</Label>
                    <Select value={form.urgency} onValueChange={(v) => set('urgency', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{URGENCY.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </FormSection>

              <div className="border-t border-border" />

              {/* Section: Location */}
              <FormSection step={3} title="Location" hint="Where is the job site?">
                <div className="space-y-1.5">
                  <Label>Job site address / location <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="123 Main St, Austin, TX" value={form.location} onChange={(e) => set('location', e.target.value)} className="pl-9" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input placeholder="Austin" value={form.city} onChange={(e) => set('city', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>State</Label>
                    <Select value={form.state} onValueChange={(v) => set('state', v)}>
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent className="max-h-72">{US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </FormSection>

              {user.plan === 'FREE' && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <p className="font-semibold text-amber-600">Free plan limit</p>
                    <p className="text-xs text-muted-foreground">You can post up to 3 jobs per month on the Free plan. Upgrade to Pro for unlimited posts.</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setView('dashboard')}>Cancel</Button>
                <Button onClick={submit} disabled={loading || !canSubmit} size="lg" className={cn(canSubmit && 'sweep-on-hover')}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FilePlus2 className="mr-1.5 h-4 w-4" /> Post job</>}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Live preview column */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Eye className="h-4 w-4" /> Live preview
              <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground/70">How subs will see it</span>
            </div>

            {/* Mock job card preview */}
            <Card className="lift-card overflow-hidden p-0">
              <div className={cn(
                'h-1 w-full bg-gradient-to-r transition-all',
                form.trade ? tradeAccentPreview(form.trade) : 'from-muted to-muted-foreground/30'
              )} />
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {form.trade ? <TradeBadge trade={form.trade} /> : <Badge variant="secondary" className="opacity-40">Trade</Badge>}
                  <Badge variant="outline" className="font-medium opacity-70">{form.category}</Badge>
                  {form.urgency ? <UrgencyBadge urgency={form.urgency} /> : null}
                </div>

                <h3 className="mt-2.5 text-lg font-bold leading-snug">
                  {form.title || <span className="text-muted-foreground/50">Your job title appears here</span>}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {form.description || 'Your job description preview will appear here as you type. Make it detailed to attract the best bids.'}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground"><DollarSign className="h-3 w-3" /> Budget</div>
                    <div className="mt-0.5 font-semibold">
                      {form.budgetMin && form.budgetMax ? `${formatMoney(Number(form.budgetMin))}–${formatMoney(Number(form.budgetMax))}` : <span className="text-muted-foreground/50">$28k–$42k</span>}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground"><MapPin className="h-3 w-3" /> Location</div>
                    <div className="mt-0.5 truncate">
                      {form.city || form.state ? `${form.city || 'City'}, ${form.state || 'ST'}` : form.location || <span className="text-muted-foreground/50">Austin, TX</span>}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground"><Clock className="h-3 w-3" /> Duration</div>
                    <div className="mt-0.5 truncate">
                      {form.duration || <span className="text-muted-foreground/50">3-4 weeks</span>}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground"><Users className="h-3 w-3" /> Crew size</div>
                    <div className="mt-0.5">
                      {form.crewSize ? `${form.crewSize} ${Number(form.crewSize) === 1 ? 'person' : 'people'}` : <span className="text-muted-foreground/50">4 people</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3">
                <div className="flex items-center gap-2 text-xs">
                  <UserAvatar user={user} className="h-6 w-6 ring-1 ring-border" />
                  <span className="font-medium">{user.company || user.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> 0 bids</span>
                  <span>· just now</span>
                </div>
              </div>
            </Card>

            {/* Tips card */}
            <Card className="border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Lightbulb className="h-4 w-4" />
                </span>
                <div className="text-xs">
                  <p className="font-bold text-primary">Tips for a great posting</p>
                  <ul className="mt-1.5 space-y-1 text-muted-foreground">
                    <li>• Include square footage &amp; site access notes</li>
                    <li>• Mention inspection deadlines &amp; permits</li>
                    <li>• List materials you&apos;ll supply vs. subcontractor</li>
                    <li>• Add photos or plans if available</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="flex items-start gap-3 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div className="text-sm">
                <p className="font-semibold">What happens next?</p>
                <p className="mt-1 text-xs text-muted-foreground">Your job goes live instantly. Subcontractors browsing the marketplace can submit bids. You&apos;ll review bids side-by-side and accept the crew that fits — all in your dashboard.</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormSection({ step, title, hint, children }: { step: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{step}</span>
        <div>
          <h3 className="text-sm font-bold">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="space-y-4 pl-10">{children}</div>
    </div>
  )
}

/** Trade → accent gradient for the preview top bar (mirrors job-card.tsx) */
function tradeAccentPreview(trade: string): string {
  const map: Record<string, string> = {
    Electrical: 'from-amber-400 to-orange-500',
    Plumbing: 'from-emerald-400 to-teal-500',
    HVAC: 'from-rose-400 to-orange-500',
    Roofing: 'from-stone-500 to-stone-700',
    Concrete: 'from-zinc-400 to-zinc-600',
    Framing: 'from-amber-600 to-yellow-700',
    Painting: 'from-rose-400 to-pink-500',
    Flooring: 'from-amber-700 to-orange-800',
    Masonry: 'from-stone-600 to-amber-800',
    General: 'from-primary to-amber-600',
  }
  return map[trade] || map.General
}
