'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { TRADES, US_STATES } from '@/lib/constants'
import type { PublicUser } from '@/lib/constants'
import { Loader2, HardHat, Wrench, Mail, Lock, User as UserIcon, Building2, Phone, MapPin, Key, AlertCircle } from 'lucide-react'
import { ForgotPasswordDialog } from './forgot-password-dialog'
import { GoogleLoginButton } from './google-login-button'
import { ResendVerification } from './resend-verification'

export function AuthModal({ open }: { open: boolean }) {
  const { authMode, closeAuth, setUser, setView, openAuth } = useApp()
  const { toast } = useToast()
  const [tab, setTab] = useState<'login' | 'signup'>(authMode)
  const [loading, setLoading] = useState(false)

  // login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // signup state
  const [role, setRole] = useState<'CONTRACTOR' | 'SUBCONTRACTOR'>('CONTRACTOR')
  const [su, setSu] = useState({
    name: '', email: '', password: '', company: '', phone: '', city: '', state: '', trade: '',
  })

  useEffect(() => {
    if (open) setTab(authMode)
  }, [open, authMode])

  const onClose = () => closeAuth()

  const doLogin = async () => {
    setLoading(true)
    try {
      const { user } = await api<{ user: PublicUser }>('/api/auth/login', {
        method: 'POST', body: { email: loginEmail, password: loginPassword },
      })
      setUser(user)
      closeAuth()
      setView('dashboard')
      toast({ title: `Welcome back, ${user.name.split(' ')[0]}!` })
    } catch (e) {
      toast({ title: 'Login failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const doSignup = async () => {
    setLoading(true)
    try {
      const { user } = await api<{ user: PublicUser }>('/api/auth/signup', {
        method: 'POST',
        body: { ...su, role },
      })
      setUser(user)
      closeAuth()
      setView('dashboard')
      toast({ title: `Welcome to CrewUp, ${user.name.split(' ')[0]}!` })
    } catch (e) {
      toast({ title: 'Sign up failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // demo login helpers
  const demoLogin = async (email: string) => {
    setLoading(true)
    try {
      const { user } = await api<{ user: PublicUser }>('/api/auth/login', {
        method: 'POST', body: { email, password: 'password123' },
      })
      setUser(user)
      closeAuth()
      setView('dashboard')
      toast({ title: `Signed in as ${user.name}` })
    } catch (e) {
      toast({ title: 'Demo login failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md overflow-y-auto p-0 sm:max-w-lg max-h-[92vh]">
        <div className="hazard-stripe h-1.5 w-full" />
        <div className="p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-2xl">{tab === 'login' ? 'Welcome back' : 'Create your account'}</DialogTitle>
            <DialogDescription>
              {tab === 'login' ? 'Sign in to manage your jobs and bids.' : 'Join CrewUp and start finding work or hiring crews.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={(v) => { setTab(v as 'login' | 'signup'); openAuth(v as 'login' | 'signup') }} className="mt-5">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Log in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            {/* LOGIN */}
            <TabsContent value="login" className="mt-5 space-y-4">
              <Field icon={Mail} label="Email">
                <Input type="email" placeholder="you@company.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="pl-9" />
              </Field>
              <Field icon={Lock} label="Password">
                <Input type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pl-9" onKeyDown={(e) => e.key === 'Enter' && doLogin()} />
              </Field>
              <div className="text-right">
                <button type="button" onClick={() => setView('forgot-password')} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Forgot password?
                </button>
              </div>
              <Button className="w-full" onClick={doLogin} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log in'}
              </Button>
              <GoogleLoginButton onLogin={() => closeAuth()} />

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center"><span className="bg-background px-2 text-xs text-muted-foreground">try a demo account</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => demoLogin('marcus@buildrightco.com')} disabled={loading} className="gap-1.5">
                  <HardHat className="h-3.5 w-3.5 text-primary" /> Contractor
                </Button>
                <Button variant="outline" size="sm" onClick={() => demoLogin('ray@voltelectric.com')} disabled={loading} className="gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-primary" /> Subcontractor
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">Click a demo account to sign in instantly</p>
            </TabsContent>

            {/* FORGOT PASSWORD */}
            {view === 'forgot-password' && (
              <ForgotPasswordDialog open={view === 'forgot-password'} onClose={() => setView('login')} />
            )}

            {/* SIGNUP */}
            <TabsContent value="signup" className="mt-5 space-y-4">
              {/* Role selector */}
              <div className="grid grid-cols-2 gap-3">
                <RoleCard active={role === 'CONTRACTOR'} onClick={() => setRole('CONTRACTOR')} icon={HardHat} title="Contractor" desc="I hire crews" />
                <RoleCard active={role === 'SUBCONTRACTOR'} onClick={() => setRole('SUBCONTRACTOR')} icon={Wrench} title="Subcontractor" desc="I do the work" />
              </div>

              <Field icon={UserIcon} label="Full name">
                <Input placeholder="Jane Smith" value={su.name} onChange={(e) => setSu({ ...su, name: e.target.value })} className="pl-9" />
              </Field>
              <Field icon={Mail} label="Email">
                <Input type="email" placeholder="you@company.com" value={su.email} onChange={(e) => setSu({ ...su, email: e.target.value })} className="pl-9" />
              </Field>
              <Field icon={Lock} label="Password">
                <Input type="password" placeholder="At least 8 characters" value={su.password} onChange={(e) => setSu({ ...su, password: e.target.value })} className="pl-9" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field icon={Building2} label="Company">
                  <Input placeholder="Acme Construction" value={su.company} onChange={(e) => setSu({ ...su, company: e.target.value })} className="pl-9" />
                </Field>
                <Field icon={Phone} label="Phone">
                  <Input placeholder="(555) 555-0100" value={su.phone} onChange={(e) => setSu({ ...su, phone: e.target.value })} className="pl-9" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field icon={MapPin} label="City">
                  <Input placeholder="Austin" value={su.city} onChange={(e) => setSu({ ...su, city: e.target.value })} className="pl-9" />
                </Field>
                <div className="space-y-1.5">
                  <Label className="text-xs">State</Label>
                  <Select value={su.state} onValueChange={(v) => setSu({ ...su, state: v })}>
                    <SelectTrigger><SelectValue placeholder="TX" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {role === 'SUBCONTRACTOR' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Primary trade</Label>
                  <Select value={su.trade} onValueChange={(v) => setSu({ ...su, trade: v })}>
                    <SelectTrigger><SelectValue placeholder="Select a trade" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button className="w-full" onClick={doSignup} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Create ${role === 'CONTRACTOR' ? 'contractor' : 'subcontractor'} account`}
              </Button>
              <GoogleLoginButton onLogin={() => closeAuth()} />
              <p className="text-center text-xs text-muted-foreground">
                By signing up you agree to our Terms and Privacy Policy.
              </p>
              <ResendVerification email={su.email} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
  )
}

function RoleCard({ active, onClick, icon: Icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ElementType; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-center transition-all ${
        active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
      }`}
    >
      <span className={`grid h-10 w-10 place-items-center rounded-lg ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-sm font-bold">{title}</span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </button>
  )
}
