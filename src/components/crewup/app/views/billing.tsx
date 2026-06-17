'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import { PLANS } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { CreditCard, Check, Loader2, Shield, Lock, Sparkles, Crown, Zap, Calendar, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Subscription {
  id: string
  plan: string
  status: string
  currentPeriodEnd: string | null
  stripeSubId: string | null
}

export function BillingView() {
  const user = useApp((s) => s.user)!
  const refreshUser = useApp((s) => s.refreshUser)
  const { toast } = useToast()
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' })

  const load = async () => {
    setLoading(true)
    try {
      const { subscription } = await api<{ subscription: Subscription | null }>('/api/payments/status')
      setSub(subscription)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const subscribe = async (plan: string) => {
    setProcessing(true)
    try {
      await api('/api/payments/subscribe', { method: 'POST', body: { plan } })
      await refreshUser()
      await load()
      setCheckoutPlan(null)
      toast({ title: 'Subscription activated!', description: `You're now on the ${plan} plan.` })
    } catch (e) {
      toast({ title: 'Payment failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const currentPlan = user.plan

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Billing & subscription</h1>
        <p className="text-sm text-muted-foreground">Manage your plan, payment method, and invoices.</p>
      </div>

      {/* Current plan */}
      <Card className="overflow-hidden">
        <div className="hazard-stripe h-1.5 w-full" />
        <div className="p-6">
          {loading ? (
            <div className="grid place-items-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className={cn('grid h-12 w-12 place-items-center rounded-xl', currentPlan === 'FREE' ? 'bg-muted' : 'bg-primary/10 text-primary')}>
                  {currentPlan === 'ENTERPRISE' ? <Crown className="h-6 w-6" /> : currentPlan === 'PRO' ? <Zap className="h-6 w-6" /> : <Sparkles className="h-6 w-6 text-muted-foreground" />}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{PLANS.find((p) => p.id === currentPlan)?.name || currentPlan}</h2>
                    <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15">{sub?.status || 'ACTIVE'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentPlan === 'FREE' ? 'Free forever' : `$${PLANS.find((p) => p.id === currentPlan)?.price}/month`}
                    {sub?.currentPeriodEnd && <> · renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}</>}
                  </p>
                </div>
              </div>
              {currentPlan !== 'ENTERPRISE' && (
                <Button onClick={() => setCheckoutPlan(currentPlan === 'FREE' ? 'PRO' : 'ENTERPRISE')}>
                  <TrendingUp className="mr-1.5 h-4 w-4" /> Upgrade
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Plans */}
      <div>
        <h3 className="mb-3 font-bold">Available plans</h3>
        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan
            return (
              <Card key={plan.id} className={cn('relative flex flex-col p-5', plan.highlight && 'border-primary ring-1 ring-primary', isCurrent && 'border-emerald-500 ring-1 ring-emerald-500')}>
                {isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-[11px] font-bold text-white">Current plan</span>
                )}
                <div className="flex items-center gap-2">
                  <span className={cn('grid h-8 w-8 place-items-center rounded-lg', plan.id === 'FREE' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
                    {plan.id === 'ENTERPRISE' ? <Crown className="h-4 w-4" /> : plan.id === 'PRO' ? <Zap className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  </span>
                  <h4 className="font-bold">{plan.name}</h4>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">${plan.price}</span>
                  <span className="text-sm text-muted-foreground">/{plan.period}</span>
                </div>
                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.slice(0, 5).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={3} />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-4 w-full"
                  variant={isCurrent ? 'outline' : plan.highlight ? 'default' : 'outline'}
                  disabled={isCurrent}
                  onClick={() => plan.id !== 'FREE' && setCheckoutPlan(plan.id)}
                >
                  {isCurrent ? 'Current plan' : plan.cta}
                </Button>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Payment method */}
      <Card className="p-6">
        <h3 className="flex items-center gap-2 font-bold"><CreditCard className="h-4 w-4 text-primary" /> Payment method</h3>
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex gap-1">
            <span className="h-6 w-5 rounded bg-amber-500" />
            <span className="h-6 w-5 -ml-3 rounded bg-rose-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">•••• •••• •••• 4242</p>
            <p className="text-xs text-muted-foreground">Visa · expires 12/27</p>
          </div>
          <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" /> Secure</Badge>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5 text-emerald-500" /> Payments are processed securely by Stripe. We never store your card details.
        </p>
      </Card>

      {/* Invoices */}
      <Card className="p-6">
        <h3 className="font-bold">Billing history</h3>
        <div className="mt-3 divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-3 text-sm">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">CrewUp {currentPlan === 'FREE' ? 'Pro' : currentPlan} — Monthly</p>
                  <p className="text-xs text-muted-foreground">{new Date(2024, 11 - i, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">${PLANS.find((p) => p.id === (currentPlan === 'FREE' ? 'PRO' : currentPlan))?.price}.00</span>
                <Badge variant="outline" className="text-emerald-600">Paid</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Checkout modal */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => !processing && setCheckoutPlan(null)}>
          <Card className="w-full max-w-md overflow-hidden p-0" onClick={(e) => e.stopPropagation()}>
            <div className="hazard-stripe h-1.5 w-full" />
            <div className="p-6">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-500" />
                <h3 className="text-lg font-bold">Secure checkout</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Upgrading to <span className="font-semibold text-foreground">{PLANS.find((p) => p.id === checkoutPlan)?.name}</span> — ${PLANS.find((p) => p.id === checkoutPlan)?.price}/month
              </p>

              <div className="mt-5 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name on card</Label>
                  <Input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="Jane Smith" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Card number</Label>
                  <Input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="4242 4242 4242 4242" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Expiry</Label>
                    <Input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} placeholder="MM/YY" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">CVC</Label>
                    <Input value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} placeholder="123" />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p>💡 This is a demo checkout. No real charge will be made — click subscribe to simulate a successful payment.</p>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCheckoutPlan(null)} disabled={processing}>Cancel</Button>
                <Button className="flex-1" onClick={() => subscribe(checkoutPlan)} disabled={processing}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Lock className="mr-1.5 h-4 w-4" /> Subscribe</>}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
