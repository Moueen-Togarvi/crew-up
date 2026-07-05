'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { TRADES, US_STATES } from '@/lib/constants'
import type { PublicUser } from '@/lib/constants'
import { Loader2, HardHat, Wrench, Mail, Lock, User as UserIcon, Building2, Phone, MapPin } from 'lucide-react'
import { GoogleLoginButton } from '@/components/crewup/auth/google-login-button'
import { ResendVerification } from '@/components/crewup/auth/resend-verification'

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

export default function SignupPage() {
  const router = useRouter()
  const { setUser, setView } = useApp()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  const [role, setRole] = useState<'CONTRACTOR' | 'SUBCONTRACTOR'>('CONTRACTOR')
  const [su, setSu] = useState({
    name: '', email: '', password: '', company: '', phone: '', city: '', state: '', trade: '',
  })

  const doSignup = async () => {
    setLoading(true)
    try {
      const { user } = await api<{ user: PublicUser }>('/api/auth/signup', {
        method: 'POST',
        body: { ...su, role },
      })
      setUser(user)
      setView('dashboard')
      router.push('/')
      toast({ title: `Welcome to BuildUp, ${user.name.split(' ')[0]}!` })
    } catch (e) {
      toast({ title: 'Sign up failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-1">Join BuildUp and start finding work or hiring crews.</p>
      </div>

      <div className="space-y-4">
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
        
        <GoogleLoginButton onLogin={() => {
          setView('dashboard')
          router.push('/')
        }} />
        
        <p className="text-center text-xs text-muted-foreground">
          By signing up you agree to our Terms and Privacy Policy.
        </p>
        
        <ResendVerification email={su.email} />
        
        <p className="text-center text-xs text-muted-foreground mt-4">
          Already have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </>
  )
}
