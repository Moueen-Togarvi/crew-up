'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApp } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

interface ForgotPasswordDialogProps {
  open: boolean
  onClose: () => void
}

export function ForgotPasswordDialog({ open, onClose }: ForgotPasswordDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { setUser, setView } = useApp()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset email')
      }

      setSent(true)
      toast({ title: 'Password reset email sent', description: data.message })
    } catch (error) {
      toast({ title: 'Failed to send email', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setSent(false)
    setEmail('')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        {!sent ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Forgot password?</DialogTitle>
              <DialogDescription>
                Enter your email address and we'll send you a link to reset your password.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>

            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => { onClose(); router.push('/login'); }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Check your email</h3>
            <p className="text-muted-foreground mb-6">
              We've sent a password reset link to <span className="font-semibold">{email}</span>. The link will expire in 15 minutes.
            </p>
            <Button variant="outline" onClick={handleBack} className="w-full">
              Send another email
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}