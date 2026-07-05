'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/** Generate a cryptographically random CSRF state token and store it in sessionStorage */
function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function GoogleLoginButton({ onLogin }: { onLogin?: () => void }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (error === 'oauth_error' || error === 'oauth_failed') {
      toast({
        title: 'Authentication failed',
        description: 'Could not complete Google login. Please try again.',
        variant: 'destructive',
      })
    }
  }, [error, toast])

  const handleGoogleLogin = async () => {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/oauth/google/callback`
    const scope = 'email profile'

    if (!clientId) {
      toast({
        title: 'Configuration error',
        description: 'Google OAuth is not configured. Please contact support.',
        variant: 'destructive',
      })
      return
    }

    // Generate and store a CSRF state token
    const state = generateState()
    try {
      sessionStorage.setItem('oauth_state', state)
    } catch {
      /* sessionStorage not available */
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scope,
        access_type: 'offline',
        prompt: 'consent',
        state: state,
      })

    window.location.href = authUrl
  }

  if (error === 'oauth_error' || error === 'oauth_failed') {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Try again
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={handleGoogleLogin}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      )}
      Continue with Google
    </Button>
  )
}
