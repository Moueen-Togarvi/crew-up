'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { PublicUser } from '@/lib/constants'
import { Loader2, HardHat, Wrench, Mail, Lock } from 'lucide-react'
import { ForgotPasswordDialog } from '@/components/crewup/auth/forgot-password-dialog'
import { GoogleLoginButton } from '@/components/crewup/auth/google-login-button'

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

export default function LoginPage() {
  const router = useRouter()
  const { setUser, setView } = useApp()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)

  const showDemo = process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true'

  const doLogin = async () => {
    setLoading(true)
    try {
      const { user } = await api<{ user: PublicUser }>('/api/auth/login', {
        method: 'POST', body: { email, password },
      })
      setUser(user)
      setView('dashboard')
      router.push('/')
      toast({ title: `Welcome back, ${user.name.split(' ')[0]}!` })
    } catch (e) {
      toast({ title: 'Login failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const demoLogin = async (demoEmail: string) => {
    setLoading(true)
    try {
      const { user } = await api<{ user: PublicUser }>('/api/auth/login', {
        method: 'POST', body: { email: demoEmail, password: 'password123' },
      })
      setUser(user)
      setView('dashboard')
      router.push('/')
      toast({ title: `Signed in as ${user.name}` })
    } catch (e) {
      toast({ title: 'Demo login failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">Sign in to manage your jobs and bids.</p>
      </div>

      <div className="space-y-4">
        <Field icon={Mail} label="Email">
          <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
        </Field>
        
        <Field icon={Lock} label="Password">
          <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" onKeyDown={(e) => e.key === 'Enter' && doLogin()} />
        </Field>
        
        <div className="text-right">
          <button type="button" onClick={() => setForgotPasswordOpen(true)} className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Forgot password?
          </button>
        </div>
        
        <Button className="w-full" onClick={doLogin} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log in'}
        </Button>
        
        <Suspense fallback={<div className="h-10 w-full animate-pulse rounded-md bg-muted" />}>
          <GoogleLoginButton onLogin={() => {
            setView('dashboard')
            router.push('/')
          }} />
        </Suspense>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center"><span className="bg-background px-2 text-xs text-muted-foreground">try a demo account</span></div>
        </div>
        
        {showDemo && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => demoLogin('marcus@buildrightco.com')} disabled={loading} className="gap-1.5">
            <HardHat className="h-3.5 w-3.5 text-primary" /> Contractor
          </Button>
          <Button variant="outline" size="sm" onClick={() => demoLogin('ray@voltelectric.com')} disabled={loading} className="gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-primary" /> Subcontractor
          </Button>
        </div>
        )}
        
        <p className="text-center text-xs text-muted-foreground mt-6">
          Don't have an account? <Link href="/signup" className="text-primary hover:underline">Sign up</Link>
        </p>
      </div>

      <ForgotPasswordDialog open={forgotPasswordOpen} onClose={() => setForgotPasswordOpen(false)} />
    </>
  )
}
