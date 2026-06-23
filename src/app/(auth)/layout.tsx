import { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-background shadow-xl">
        <div className="hazard-stripe h-1.5 w-full" />
        <div className="p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
