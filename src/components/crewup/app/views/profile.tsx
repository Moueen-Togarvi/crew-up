'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import type { JobWithRelations, PublicUser } from '@/lib/constants'
import { TRADES, US_STATES } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserAvatar } from '@/components/crewup/shared/user-avatar'
import { TradeBadge, VerifiedBadge, StatusBadge } from '@/components/crewup/shared/badges'
import { Rating } from '@/components/crewup/shared/rating'
import { formatMoney, timeAgo } from '@/components/crewup/shared/format'
import { useToast } from '@/hooks/use-toast'
import { MapPin, Phone, Mail, Wrench, HardHat, Star, MessageSquare, Loader2, Pencil, Save, X, Briefcase, DollarSign, Clock, CheckCircle2, Share2, BarChart3, Zap, Droplets, Wind, Home, Layers, Brush, Hammer, Flame, Trees, BrickWall, Grid3x3 } from 'lucide-react'

interface Review {
  id: string
  rating: number
  comment: string
  createdAt: string
  author: PublicUser
}

interface PortfolioItem {
  id: string
  title: string
  trade: string
  category: string
  budgetMin: number
  budgetMax: number
  city: string | null
  state: string | null
  completedAt: string | null
  imageUrl: string | null
  partnerName: string
  partnerCompany: string | null
}

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

function tradeIcon(trade: string): React.ElementType {
  switch (trade) {
    case 'Electrical': return Zap
    case 'Plumbing': return Droplets
    case 'HVAC': return Wind
    case 'Roofing': return Home
    case 'Concrete': return Layers
    case 'Framing': return Grid3x3
    case 'Painting': return Brush
    case 'Flooring': return Layers
    case 'Masonry': return BrickWall
    case 'Welding': return Flame
    case 'Carpentry': return Hammer
    case 'Landscaping': return Trees
    default: return Wrench
  }
}

export function ProfileView() {
  const profileUserId = useApp((s) => s.profileUserId)
  const user = useApp((s) => s.user)!
  const openJob = useApp((s) => s.openJob)
  const openConversation = useApp((s) => s.openConversation)
  const openAuth = useApp((s) => s.openAuth)
  const setView = useApp((s) => s.setView)
  const { toast } = useToast()

  const targetId = profileUserId || user.id
  const [profile, setProfile] = useState<PublicUser | null>(null)
  const [jobs, setJobs] = useState<JobWithRelations[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [portfolioLoading, setPortfolioLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      // find user via marketplace lists (we don't have a dedicated /api/users/[id], reuse)
      const [subsRes, consRes] = await Promise.all([
        api<{ users: PublicUser[] }>('/api/marketplace/subcontractors'),
        api<{ users: PublicUser[] }>('/api/marketplace/contractors'),
      ])
      const all = [...subsRes.users, ...consRes.users]
      const found = all.find((u) => u.id === targetId) || (targetId === user.id ? user : null)
      setProfile(found)
      if (found) {
        setEditForm({
          name: found.name, company: found.company || '', phone: found.phone || '',
          city: found.city || '', state: found.state || '', bio: found.bio || '',
          trade: found.trade || '', skills: found.skills || '', hourlyRate: found.hourlyRate ? String(found.hourlyRate) : '',
          avatarUrl: found.avatarUrl || '',
        })
      }
      const { jobs: allJobs } = await api<{ jobs: JobWithRelations[] }>('/api/jobs')
      setJobs(allJobs.filter((j) => j.contractorId === targetId))
      const { reviews: revs } = await api<{ reviews: Review[] }>(`/api/reviews?targetId=${targetId}`)
      setReviews(revs)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [targetId])

  // Portfolio is loaded separately so we can show shimmer skeletons while it fetches
  useEffect(() => {
    let cancelled = false
    setPortfolioLoading(true)
    api<{ portfolio: PortfolioItem[] }>(`/api/users/${targetId}/portfolio`)
      .then(({ portfolio: pf }) => { if (!cancelled) setPortfolio(pf) })
      .catch(() => { if (!cancelled) setPortfolio([]) })
      .finally(() => { if (!cancelled) setPortfolioLoading(false) })
    return () => { cancelled = true }
  }, [targetId])

  const saveProfile = async () => {
    setSaving(true)
    try {
      const { user: updated } = await api<{ user: PublicUser }>('/api/auth/me', {
        method: 'PATCH',
        body: {
          name: editForm.name,
          company: editForm.company,
          phone: editForm.phone,
          city: editForm.city,
          state: editForm.state,
          bio: editForm.bio,
          avatarUrl: editForm.avatarUrl,
          trade: editForm.trade,
          skills: editForm.skills,
          hourlyRate: editForm.hourlyRate,
        },
      })
      // update global store so sidebar/topbar reflect new info immediately
      useApp.setState({ user: updated })
      if (profile) setProfile({ ...profile, ...updated })
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' })
      setEditing(false)
    } catch (e) {
      toast({ title: 'Failed to save', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const messageUser = async () => {
    if (!profile) return
    if (!user) { openAuth('login'); return }
    try {
      const { conversationId } = await api<{ conversationId: string }>('/api/messages/conversations', {
        method: 'POST', body: { targetUserId: profile.id, body: `Hi ${profile.name.split(' ')[0]}, I'd like to connect.` },
      })
      openConversation(conversationId)
    } catch (e) {
      toast({ title: 'Failed to start conversation', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const shareProfile = async () => {
    if (!profile) return
    const url = `${window.location.origin}/?u=${profile.id}`
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
      } else {
        // Fallback for environments without clipboard API
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      toast({ title: 'Profile link copied', description: 'Share it with anyone.' })
    } catch {
      toast({ title: 'Could not copy', description: 'Copy the URL from your address bar instead.', variant: 'destructive' })
    }
  }

  const submitReview = async () => {
    if (!profile) return
    if (!user) { openAuth('login'); return }
    if (!reviewText) { toast({ title: 'Please write a review', variant: 'destructive' }); return }
    setSubmittingReview(true)
    try {
      await api('/api/reviews', { method: 'POST', body: { targetId: profile.id, rating: reviewRating, comment: reviewText } })
      toast({ title: 'Review submitted!' })
      setReviewText('')
      load()
    } catch (e) {
      toast({ title: 'Failed to submit review', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (!profile) return <Card className="p-12 text-center"><p>Profile not found.</p></Card>

  const isOwn = profile.id === user.id
  const isContractor = profile.role === 'CONTRACTOR'

  return (
    <div className="space-y-5">
      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="hazard-stripe h-2 w-full" />
        <div className="relative bg-gradient-to-br from-primary/5 via-transparent to-amber-400/5 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <UserAvatar user={profile} className="h-16 w-16 sm:h-20 sm:w-20" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight">{profile.name}</h1>
                  {profile.verified && <VerifiedBadge />}
                </div>
                <p className="text-sm text-muted-foreground">{profile.company || profile.trade}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <Rating value={profile.rating} count={profile.reviewCount} size="md" />
                  <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {profile.jobsCompleted} jobs</span>
                  {profile.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {profile.city}, {profile.state}</span>}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1.5">
                    {isContractor ? <><HardHat className="h-3 w-3" /> Contractor</> : <><Wrench className="h-3 w-3" /> {profile.trade || 'Subcontractor'}</>}
                  </Badge>
                  <Badge variant="outline">{profile.plan} plan</Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {isOwn ? (
                <Button variant="outline" onClick={() => setEditing((e) => !e)}>
                  {editing ? <><X className="mr-1.5 h-4 w-4" /> Cancel</> : <><Pencil className="mr-1.5 h-4 w-4" /> Edit profile</>}
                </Button>
              ) : (
                <Button onClick={messageUser}><MessageSquare className="mr-1.5 h-4 w-4" /> Message</Button>
              )}
            </div>
          </div>

          {!editing && profile.bio && (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
          )}

          {!editing && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {profile.phone && <InfoChip icon={Phone} label="Phone" value={profile.phone} />}
              <InfoChip icon={Mail} label="Email" value={profile.email} />
              {profile.hourlyRate && <InfoChip icon={DollarSign} label="Rate" value={`$${profile.hourlyRate}/hr`} />}
              <InfoChip icon={Clock} label="Joined" value={timeAgo(profile.createdAt)} />
            </div>
          )}

          {!editing && profile.skills && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {profile.skills.split(',').map((s, idx) => (
                  <Badge key={s} variant="secondary" className="gap-1.5 transition-transform hover:scale-105">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" style={{ opacity: 1 - idx * 0.15 }} />
                    {s.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Profile completion indicator */}
          {!editing && isOwn && (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">Profile completeness</span>
                <span className="font-bold text-primary">{getProfileCompletion(profile)}%</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400 transition-all" style={{ width: `${getProfileCompletion(profile)}%` }} />
              </div>
              {getProfileCompletion(profile) < 100 && (
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {!profile.bio ? 'Add a bio' : !profile.city ? 'Add your location' : !profile.phone ? 'Add a phone number' : 'Complete all fields'} to improve your visibility
                </p>
              )}
            </div>
          )}
          {/* Thin gradient bottom border accent */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>

        {/* Edit form */}
        {editing && isOwn && (
          <div className="border-t border-border bg-muted/30 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name"><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></Field>
              <Field label="Company"><Input value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} /></Field>
              <Field label="Phone"><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></Field>
              <Field label="Avatar URL"><Input value={editForm.avatarUrl} onChange={(e) => setEditForm({ ...editForm, avatarUrl: e.target.value })} placeholder="https://…" /></Field>
              <Field label="City"><Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} /></Field>
              <div className="space-y-1.5">
                <Label className="text-xs">State</Label>
                <Select value={editForm.state} onValueChange={(v) => setEditForm({ ...editForm, state: v })}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent className="max-h-72">{US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {!isContractor && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Primary trade</Label>
                    <Select value={editForm.trade} onValueChange={(v) => setEditForm({ ...editForm, trade: v })}>
                      <SelectTrigger><SelectValue placeholder="Select trade" /></SelectTrigger>
                      <SelectContent className="max-h-72">{TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Field label="Hourly rate (USD)"><Input type="number" value={editForm.hourlyRate} onChange={(e) => setEditForm({ ...editForm, hourlyRate: e.target.value })} /></Field>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Skills (comma separated)</Label>
                    <Input value={editForm.skills} onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })} placeholder="Wiring, Panel Upgrades, Lighting" />
                  </div>
                </>
              )}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Bio</Label>
                <Textarea rows={3} value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Tell contractors about your experience and crew." />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={saveProfile} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-1.5 h-4 w-4" /> Save changes</>}</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Quick actions row — only when viewing your own profile */}
      {isOwn && !editing && (
        <div className="flex flex-wrap gap-2 animate-fade-in-up">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-4 w-4" /> Edit profile
          </Button>
          <Button variant="outline" size="sm" onClick={shareProfile}>
            <Share2 className="mr-1.5 h-4 w-4" /> Share profile
          </Button>
          <Button variant="outline" size="sm" onClick={() => setView('analytics')}>
            <BarChart3 className="mr-1.5 h-4 w-4" /> View analytics
          </Button>
        </div>
      )}

      {/* Portfolio gallery — Recent work / Completed projects */}
      <section className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold">{isContractor ? 'Completed projects' : 'Recent work'}</h2>
            <p className="text-xs text-muted-foreground">
              {portfolio.length} {portfolio.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
        </div>

        {portfolioLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="overflow-hidden border border-border p-0">
                <div className="shimmer h-1.5 w-full" />
                <div className="space-y-3 p-4">
                  <div className="flex items-center gap-2.5">
                    <div className="shimmer h-9 w-9 rounded-md" />
                    <div className="shimmer h-4 w-3/4 rounded" />
                  </div>
                  <div className="flex gap-1.5">
                    <div className="shimmer h-5 w-20 rounded-full" />
                    <div className="shimmer h-5 w-16 rounded-full" />
                  </div>
                  <div className="shimmer h-3 w-1/2 rounded" />
                  <div className="shimmer h-3 w-2/3 rounded" />
                  <div className="shimmer h-3 w-1/2 rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : portfolio.length === 0 ? (
          <Card className="flex flex-col items-center justify-center border-dashed p-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-muted">
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            </span>
            <p className="mt-3 font-medium">No completed work yet</p>
            <p className="text-sm text-muted-foreground">Projects you've completed will appear here.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.map((item, index) => {
              const Icon = tradeIcon(item.trade)
              return (
                <Card
                  key={item.id}
                  className="lift-card animate-stagger-in cursor-pointer overflow-hidden border border-border p-0 transition-all hover:border-primary/40"
                  style={{ animationDelay: index * 60 + 'ms' }}
                  onClick={() => openJob(item.id)}
                >
                  {/* Gradient top accent bar */}
                  <div className="h-1.5 w-full bg-gradient-to-r from-primary to-amber-400" />
                  <div className="p-4">
                    <div className="flex items-start gap-2.5">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gradient-to-br ${tradeGradient(item.trade)} text-white shadow-sm`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <h3 className="line-clamp-1 flex-1 pt-1 font-bold">{item.title}</h3>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <TradeBadge trade={item.trade} />
                      <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <DollarSign className="h-3 w-3" />
                        {formatMoney(item.budgetMin)}–{formatMoney(item.budgetMax)}
                      </span>
                      {(item.city || item.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[item.city, item.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <span>with {item.partnerName}</span>
                      {item.partnerCompany && <span className="text-muted-foreground/70">· {item.partnerCompany}</span>}
                    </div>
                    <div className="mt-2">
                      {item.completedAt ? (
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Completed {timeAgo(item.completedAt)}
                        </p>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">In progress</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          {isContractor && <TabsTrigger value="jobs">Posted jobs ({jobs.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="reviews" className="mt-4 space-y-4">
          {/* Review summary card */}
          {reviews.length > 0 && (
            <Card className="overflow-hidden">
              <div className="hazard-stripe h-1 w-full" />
              <div className="p-5">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  {/* Overall rating */}
                  <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-amber-400/5 p-6 text-center sm:min-w-[140px]">
                    <p className="text-4xl font-extrabold text-gradient-primary">{profile.rating.toFixed(1)}</p>
                    <Rating value={profile.rating} size="md" className="mt-2" />
                    <p className="mt-1 text-xs text-muted-foreground">{profile.reviewCount} review{profile.reviewCount === 1 ? '' : 's'}</p>
                  </div>
                  {/* Star distribution */}
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviews.filter((r) => Math.round(r.rating) === star).length
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                      return (
                        <div key={star} className="flex items-center gap-2 text-sm">
                          <span className="flex w-8 items-center gap-0.5 font-medium">
                            {star} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-muted">
                            <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-8 text-right text-xs text-muted-foreground">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Leave review */}
          {!isOwn && (
            <Card className="overflow-hidden">
              <div className="hazard-stripe h-1 w-full" />
              <div className="p-5">
                <h3 className="font-bold">Leave a review</h3>
                <div className="mt-3 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setReviewRating(n)} className="p-0.5 transition-transform hover:scale-110">
                      <Star className={`h-6 w-6 ${n <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`} />
                    </button>
                  ))}
                </div>
                <Textarea className="mt-3" rows={3} placeholder="Share your experience working with this professional…" value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
                <Button className="mt-3" onClick={submitReview} disabled={submittingReview}>
                  {submittingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit review'}
                </Button>
              </div>
            </Card>
          )}

          {reviews.length === 0 ? (
            <Card className="p-8 text-center"><Star className="mx-auto h-10 w-10 text-muted-foreground/40" /><p className="mt-3 font-medium">No reviews yet</p><p className="text-sm text-muted-foreground">Reviews appear after completed jobs.</p></Card>
          ) : (
            reviews.map((r) => (
              <Card key={r.id} className="p-5 transition-colors hover:bg-accent/20">
                <div className="flex items-start gap-3 border-l-2 border-primary/20 pl-3">
                  <UserAvatar user={r.author} className="h-10 w-10" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{r.author.name}</p>
                      <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
                    </div>
                    <Rating value={r.rating} className="mt-0.5" />
                    <p className="mt-2 text-sm leading-relaxed">{r.comment}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {isContractor && (
          <TabsContent value="jobs" className="mt-4 space-y-3">
            {jobs.length === 0 ? (
              <Card className="p-8 text-center"><Briefcase className="mx-auto h-10 w-10 text-muted-foreground/40" /><p className="mt-3 font-medium">No jobs posted</p></Card>
            ) : jobs.map((job) => (
              <Card key={job.id} className="cursor-pointer p-5 transition-all hover:border-primary/30 hover:shadow-md" onClick={() => openJob(job.id)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <TradeBadge trade={job.trade} />
                      <StatusBadge status={job.status} />
                    </div>
                    <h3 className="mt-1.5 font-bold">{job.title}</h3>
                    <p className="text-xs text-muted-foreground">{formatMoney(job.budgetMin)}–{formatMoney(job.budgetMax)} · {job.city || job.location} · {timeAgo(job.createdAt)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function getProfileCompletion(p: PublicUser): number {
  let score = 0
  const total = 7
  if (p.name) score++
  if (p.bio) score++
  if (p.city) score++
  if (p.phone) score++
  if (p.avatarUrl) score++
  if (p.company || p.trade) score++
  if (p.skills) score++
  return Math.round((score / total) * 100)
}

function InfoChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="lift-card flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}


