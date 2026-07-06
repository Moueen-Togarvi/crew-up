'use client'

import { Logo } from '@/components/crewup/shared/logo'
import { useApp } from '@/lib/store'
import { HardHat, Wrench, Twitter, Linkedin, Facebook, Mail } from 'lucide-react'

const cols = [
  { title: 'Platform', links: ['How it works', 'Marketplace', 'Pricing', 'Reviews'] },
  { title: 'For pros', links: ['For contractors', 'For subcontractors', 'Verification', 'Pro membership'] },
  { title: 'Company', links: ['About', 'Careers', 'Blog', 'Contact'] },
  { title: 'Legal', links: ['Terms', 'Privacy', 'Safety', 'Cookie policy'] },
]

export function Footer() {
  const setView = useApp((s) => s.setView)
  const setDirectoryRole = useApp((s) => s.setDirectoryRole)

  return (
    <footer className="mt-auto border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The construction workforce marketplace. Connecting contractors with the crews who get it done.
            </p>
            <div className="mt-5 flex gap-2">
              {[Twitter, Linkedin, Facebook, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  aria-label="social link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-bold">{col.title}</h4>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <button
                      onClick={() => {
                        if (link === 'For contractors') { setDirectoryRole('CONTRACTOR'); setView('directory') }
                        else if (link === 'For subcontractors') { setDirectoryRole('SUBCONTRACTOR'); setView('directory') }
                        else if (link === 'Marketplace') { setDirectoryRole('SUBCONTRACTOR'); setView('directory') }
                        else if (link === 'Pricing') document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
                        else if (link === 'How it works') document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} BuildUp. Built for the trades.</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><HardHat className="h-3.5 w-3.5 text-primary" /> Contractors</span>
            <span className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5 text-primary" /> Subcontractors</span>
            <span>Made with care</span>
          </div>
        </div>

        <div className="mt-6 text-center border-t border-border/50 pt-4">
          <p className="text-sm text-muted-foreground">
            This site developed by{' '}
            <a
              href="https://voquarn.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-bold text-primary hover:text-primary/80 transition-colors hover:underline inline-block align-middle"
            >
              Voquarn Code
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
