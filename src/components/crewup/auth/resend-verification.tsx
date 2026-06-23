'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Mail, CheckCircle, RefreshCw } from 'lucide-react'

interface ResendVerificationProps {
  email: string
  onVerified?: () => void
}

export function ResendVerification({ email, onVerified }: ResendVerificationProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const handleResend = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification email')
      }

      setSent(true)
      setCountdown(60)
      toast({ title: 'Verification email sent', description: data.message })

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            setSent(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error) {
      toast({ title: 'Failed to send email', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 dark:bg-green-950 dark:border-green-900 dark:text-green-100">
        <CheckCircle className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm">
          Verification email sent! Resend in <span className="font-semibold">{countdown}s</span>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-100">
        <Mail className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm">
          Please verify your email to complete your account setup
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={handleResend}
        disabled={loading || countdown > 0}
        className="w-full"
      >
        {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
        {countdown > 0 ? `Resend in ${countdown}s` : 'Resend verification email'}
      </Button>
    </div>
  )
}