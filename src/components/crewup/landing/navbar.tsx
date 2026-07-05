'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/crewup/shared/logo'
import { Button } from '@/components/ui/button'
import { Menu, X, HardHat, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'How it works', target: 'how' },
  { label: 'Features', target: 'features' },
  { label: 'Marketplace', target: 'marketplace' },
  { label: 'Pricing', target: 'pricing' },
]

export function LandingNavbar() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    setOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all',
        scrolled ? 'border-b border-border bg-background/85 backdrop-blur-lg' : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button onClick={() => scrollTo('top')} aria-label="BuildUp home">
          <Logo />
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <button
              key={l.target}
              onClick={() => scrollTo(l.target)}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" onClick={() => router.push('/login')} className="font-medium">
            Log in
          </Button>
          <Button onClick={() => router.push('/signup')} className="font-semibold shadow-sm">
            Get started
          </Button>
        </div>

        <button
          className="grid h-10 w-10 place-items-center rounded-md hover:bg-accent md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
            {navLinks.map((l) => (
              <button
                key={l.target}
                onClick={() => scrollTo(l.target)}
                className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-accent"
              >
                {l.label}
              </button>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Button variant="outline" onClick={() => { setOpen(false); router.push('/login') }}>
                Log in
              </Button>
              <Button onClick={() => { setOpen(false); router.push('/signup') }}>
                Get started
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-4 rounded-lg bg-accent/60 p-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><HardHat className="h-4 w-4 text-primary" /> For contractors</span>
              <span className="flex items-center gap-1.5"><Wrench className="h-4 w-4 text-primary" /> For subs</span>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
