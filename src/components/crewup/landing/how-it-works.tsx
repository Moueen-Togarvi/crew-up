'use client'

import { HardHat, Wrench, FileText, MessageSquare, CheckCircle2, ClipboardCheck } from 'lucide-react'

const contractorSteps = [
  { icon: FileText, title: 'Post your job', desc: 'Describe the scope, trade, budget, and timeline. It takes under two minutes.' },
  { icon: ClipboardCheck, title: 'Compare bids', desc: 'Receive bids from vetted subcontractors. Review ratings, history, and pricing side by side.' },
  { icon: MessageSquare, title: 'Message & hire', desc: 'Chat directly, ask questions, and assign the crew that fits your build.' },
  { icon: CheckCircle2, title: 'Get it built', desc: 'Track progress, leave a review, and build a crew you can call on again.' },
]

const subSteps = [
  { icon: Search2, title: 'Find work', desc: 'Browse open jobs filtered by trade, location, and budget. No more cold calls.' },
  { icon: Wrench, title: 'Submit a bid', desc: 'Send your price, timeline, and a message that shows why you&apos;re the right crew.' },
  { icon: MessageSquare, title: 'Coordinate', desc: 'Message the contractor, confirm details, and get on the schedule.' },
  { icon: CheckCircle2, title: 'Build & grow', desc: 'Complete the job, collect reviews, and climb the marketplace rankings.' },
]

function Search2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

export function HowItWorks() {
  return (
    <section id="how" className="border-y border-border bg-secondary/40 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">How it works</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Two sides of the same job site</h2>
          <p className="mt-3 text-muted-foreground">
            Whether you&apos;re hiring crews or looking for work, CrewUp keeps the whole process moving.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Contractors */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <HardHat className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xl font-bold">For contractors</h3>
                <p className="text-sm text-muted-foreground">Hire reliable crews fast</p>
              </div>
            </div>
            <ol className="mt-6 space-y-5">
              {contractorSteps.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <div className="relative flex flex-col items-center">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {i + 1}
                    </span>
                    {i < contractorSteps.length - 1 && <span className="mt-1 h-full w-px bg-border" />}
                  </div>
                  <div className="pb-1">
                    <div className="flex items-center gap-2">
                      <s.icon className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold">{s.title}</h4>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Subcontractors */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Wrench className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xl font-bold">For subcontractors</h3>
                <p className="text-sm text-muted-foreground">Fill your pipeline with real work</p>
              </div>
            </div>
            <ol className="mt-6 space-y-5">
              {subSteps.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <div className="relative flex flex-col items-center">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {i + 1}
                    </span>
                    {i < subSteps.length - 1 && <span className="mt-1 h-full w-px bg-border" />}
                  </div>
                  <div className="pb-1">
                    <div className="flex items-center gap-2">
                      <s.icon className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold">{s.title}</h4>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
