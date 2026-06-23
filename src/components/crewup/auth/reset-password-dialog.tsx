'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApp } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { Lock, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react'

interface ResetPasswordDialogProps {
  open: boolean
  onClose: () => void
}

export function ResetPasswordDialog({ open, onClose }: ResetPasswordDialogProps) {
  const { toast } = useToast()
  const { setUser, setView } = useApp()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const searchParams = new URLSearchParams(window.location.search)
      const token = searchParams.get('token')

      if (!token) {
        throw new Error('Reset token not found')
      }

      const response = await fetch(`/api/auth/reset-password?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }

      setSuccess(true)
      toast({ title: 'Password reset successful', description: data.message })
    } catch (error) {
      toast({ title: 'Failed to reset password', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setSuccess(false)
    setPassword('')
    // Clear token from URL
    const url = new URL(window.location.href)
    url.searchParams.delete('token')
    window.history.replaceState({}, '', url.toString())
    setView('login')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        {!success ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Reset your password</DialogTitle>
              <DialogDescription>
                Enter your new password below. The password must be at least 8 characters.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    required
                    minLength={8}
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset password'}
              </Button>
            </form>

            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={handleBack}
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
            <h3 className="text-xl font-semibold mb-2">Password reset successful!</h3>
            <p className="text-muted-foreground mb-6">
              You can now use your new password to login to your account.
            </p>
            <Button onClick={handleBack} className="w-full">
              Go to login
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}