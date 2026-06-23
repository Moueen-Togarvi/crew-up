'use client'

import { useEffect } from 'react'
import { ResetPasswordDialog } from '@/components/crewup/auth/reset-password-dialog'

export default function ResetPasswordPage() {
  useEffect(() => {
    // Check if token exists in URL
    const searchParams = new URLSearchParams(window.location.search)
    const token = searchParams.get('token')

    if (!token) {
      // Token not found, redirect to login
      window.location.href = '/?view=login'
    }
  }, [])

  return <ResetPasswordDialog open={true} onClose={() => window.location.href = '/?view=login'} />
}