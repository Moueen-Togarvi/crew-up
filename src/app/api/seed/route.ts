import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const seedSecret = process.env.SEED_SECRET
  if (!seedSecret) {
    return NextResponse.json({ error: 'Seed endpoint is disabled — set SEED_SECRET to enable' }, { status: 403 })
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${seedSecret}`) {
    return NextResponse.json({ error: 'Invalid seed secret' }, { status: 403 })
  }

  // wipe
  await db.message.deleteMany()
  await db.conversation.deleteMany()
  await db.review.deleteMany()
  await db.bid.deleteMany()
  await db.job.deleteMany()
  await db.subscription.deleteMany()
  await db.user.deleteMany()

  const passwordHash = await bcrypt.hash(process.env.DEMO_PASSWORD || 'password123', 12)

  // Contractors
  const contractors = await Promise.all([
    db.user.create({
      data: {
        email: 'marcus@buildrightco.com',
        passwordHash,
        name: 'Marcus Hale',
        role: 'CONTRACTOR',
        company: 'BuildRight Construction Co.',
        phone: '512-555-0142',
        city: 'Austin', state: 'TX',
        bio: 'General contractor specializing in commercial builds across central Texas. 15+ years running crews.',
        rating: 4.8, reviewCount: 34, jobsCompleted: 87, verified: true, plan: 'PRO',
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-marcus.png',
      },
    }),
    db.user.create({
      data: {
        email: 'elena@summithomes.com',
        passwordHash,
        name: 'Elena Rossi',
        role: 'CONTRACTOR',
        company: 'Summit Homes Group',
        phone: '303-555-0178',
        city: 'Denver', state: 'CO',
        bio: 'Residential developer building custom homes in the Rockies. Always looking for reliable finish crews.',
        rating: 4.9, reviewCount: 52, jobsCompleted: 120, verified: true, plan: 'ENTERPRISE',
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-elena.png',
      },
    }),
    db.user.create({
      data: {
        email: 'derek@apexgc.com',
        passwordHash,
        name: 'Derek Coleman',
        role: 'CONTRACTOR',
        company: 'Apex General Contractors',
        phone: '602-555-0199',
        city: 'Phoenix', state: 'AZ',
        bio: 'Industrial and warehouse projects across the Southwest. Big crews, tight schedules.',
        rating: 4.6, reviewCount: 21, jobsCompleted: 45, verified: true, plan: 'PRO',
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-derek.png',
      },
    }),
  ])

  // Subcontractors
  const subcontractors = await Promise.all([
    db.user.create({
      data: {
        email: 'ray@voltelectric.com', passwordHash, name: 'Ray Delgado', role: 'SUBCONTRACTOR',
        company: 'Volt Electric LLC', phone: '512-555-0210', city: 'Austin', state: 'TX',
        trade: 'Electrical', skills: 'Wiring,Panel Upgrades,Lighting,Inspections', hourlyRate: 85,
        bio: 'Licensed master electrician. Commercial and residential. Available for multi-week engagements.',
        rating: 4.9, reviewCount: 41, jobsCompleted: 73, verified: true, plan: 'PRO',
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-ray.png',
      },
    }),
    db.user.create({
      data: {
        email: 'tasha@flowproplumbing.com', passwordHash, name: 'Tasha Brooks', role: 'SUBCONTRACTOR',
        company: 'FlowPro Plumbing', phone: '303-555-0233', city: 'Denver', state: 'CO',
        trade: 'Plumbing', skills: 'Rough-in,Fixtures,Repairs,Backflow', hourlyRate: 78,
        bio: 'Full-service plumbing crew of 6. Fast turnaround on rough-ins and trim-out.',
        rating: 4.7, reviewCount: 28, jobsCompleted: 51, verified: true, plan: 'PRO',
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-tasha.png',
      },
    }),
    db.user.create({
      data: {
        email: 'jorge@irontreeframing.com', passwordHash, name: 'Jorge Mendoza', role: 'SUBCONTRACTOR',
        company: 'IronTree Framing', phone: '512-555-0244', city: 'San Antonio', state: 'TX',
        trade: 'Framing', skills: 'Wood Framing,Trusses,Decking', hourlyRate: 62,
        bio: 'Framing crew of 8. Custom homes and light commercial. We hit our schedules.',
        rating: 4.5, reviewCount: 19, jobsCompleted: 38, verified: false, plan: 'FREE',
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-jorge.png',
      },
    }),
    db.user.create({
      data: {
        email: 'priya@peakroofing.com', passwordHash, name: 'Priya Shah', role: 'SUBCONTRACTOR',
        company: 'Peak Roofing Solutions', phone: '602-555-0266', city: 'Phoenix', state: 'AZ',
        trade: 'Roofing', skills: 'Shingle,Metal,Flat Roof,Repairs', hourlyRate: 70,
        bio: 'Roofing specialists. OSHA certified crew. Free estimates and 10-year workmanship warranty.',
        rating: 4.8, reviewCount: 33, jobsCompleted: 64, verified: true, plan: 'PRO',
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-priya.png',
      },
    }),
    db.user.create({
      data: {
        email: 'sam@solidgroundconcrete.com', passwordHash, name: 'Sam Whitaker', role: 'SUBCONTRACTOR',
        company: 'Solid Ground Concrete', phone: '512-555-0277', city: 'Austin', state: 'TX',
        trade: 'Concrete', skills: 'Foundations,Slabs,Driveways,Stamped', hourlyRate: 68,
        bio: 'Flatwork and foundations. Crew of 10 with our own pump truck.',
        rating: 4.6, reviewCount: 22, jobsCompleted: 40, verified: true, plan: 'FREE',
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-sam.png',
      },
    }),
    db.user.create({
      data: {
        email: 'lena@climatehvacpros.com', passwordHash, name: 'Lena Fischer', role: 'SUBCONTRACTOR',
        company: 'Climate HVAC Pros', phone: '303-555-0288', city: 'Denver', state: 'CO',
        trade: 'HVAC', skills: 'Install,Service,Ductwork,Commercial', hourlyRate: 92,
        bio: 'Commercial HVAC install and service. NATE certified techs on every job.',
        rating: 4.9, reviewCount: 47, jobsCompleted: 91, verified: true, plan: 'PRO',
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-lena.png',
      },
    }),
  ])

  // subscriptions
  for (const u of [...contractors, ...subcontractors]) {
    await db.subscription.create({
      data: { userId: u.id, plan: u.plan, status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 86400000 * 30) },
    })
  }

  // Jobs
  const jobDefs = [
    { title: 'Commercial Office Build-Out — Electrical', description: 'Full electrical for a 12,000 sqft office build-out in north Austin. Includes panel, lighting, data drops, and final inspection. Plans available. Need a crew of 3-4 for roughly 4 weeks.', trade: 'Electrical', category: 'Commercial', budgetMin: 28000, budgetMax: 42000, location: 'North Austin, TX', city: 'Austin', state: 'TX', duration: '3-4 weeks', crewSize: 4, urgency: 'URGENT', contractor: contractors[0] },
    { title: 'Custom Home — Rough Plumbing', description: 'Rough-in plumbing for a 4,200 sqft custom home in the foothills. PEX throughout, 4 baths, kitchen, laundry, and bar. Need completion before drywall phase in 3 weeks.', trade: 'Plumbing', category: 'Residential', budgetMin: 14000, budgetMax: 22000, location: 'Evergreen, CO', city: 'Denver', state: 'CO', duration: '2-3 weeks', crewSize: 3, urgency: 'STANDARD', contractor: contractors[1] },
    { title: 'Warehouse — Roof Replacement', description: 'Tear off and replace 30,000 sqft flat roof on a distribution warehouse. Two layers existing. New TPO system with 20-year warranty preferred. Crane access available.', trade: 'Roofing', category: 'Industrial', budgetMin: 85000, budgetMax: 120000, location: 'West Phoenix, AZ', city: 'Phoenix', state: 'AZ', duration: '4-6 weeks', crewSize: 8, urgency: 'STANDARD', contractor: contractors[2] },
    { title: 'Residential — Wood Framing Package', description: 'Complete framing package for a two-story 3,500 sqft home. Includes floors, walls, roof trusses, and sheathing. Materials on site. Plans engineered.', trade: 'Framing', category: 'Residential', budgetMin: 38000, budgetMax: 52000, location: 'Boulder, CO', city: 'Denver', state: 'CO', duration: '3 weeks', crewSize: 6, urgency: 'FLEXIBLE', contractor: contractors[1] },
    { title: 'Foundation & Slab — Retail Shell', description: 'Pour foundation and slab for a 8,000 sqft retail shell. Site work complete, ready to form. Need crew with pump capability. Rebar and materials supplied.', trade: 'Concrete', category: 'Commercial', budgetMin: 32000, budgetMax: 48000, location: 'Round Rock, TX', city: 'Austin', state: 'TX', duration: '2 weeks', crewSize: 6, urgency: 'URGENT', contractor: contractors[0] },
    { title: 'Office Tower — HVAC Installation', description: 'Install 4 rooftop units and run all ductwork for a 3-story office building. Equipment delivered. Need coordinated install with general contractor over 5 weeks.', trade: 'HVAC', category: 'Commercial', budgetMin: 95000, budgetMax: 140000, location: 'Downtown Denver, CO', city: 'Denver', state: 'CO', duration: '5 weeks', crewSize: 5, urgency: 'STANDARD', contractor: contractors[1] },
    { title: 'Restaurant Build-Out — Full Electrical', description: 'Tenant improvement for a new restaurant. Heavy kitchen loads, hood interlocks, dining lighting. Plans stamped. Health dept inspection in 6 weeks.', trade: 'Electrical', category: 'Commercial', budgetMin: 22000, budgetMax: 34000, location: 'Tempe, AZ', city: 'Phoenix', state: 'AZ', duration: '3 weeks', crewSize: 3, urgency: 'URGENT', contractor: contractors[2] },
    { title: 'Multi-Family — Plumbing Trim-Out', description: 'Plumbing trim-out for a 24-unit apartment building. Fixtures, final connections, and inspection coordination. Rough-in complete.', trade: 'Plumbing', category: 'Residential', budgetMin: 26000, budgetMax: 38000, location: 'Lakeway, TX', city: 'Austin', state: 'TX', duration: '4 weeks', crewSize: 4, urgency: 'STANDARD', contractor: contractors[0] },
  ]

  const jobs = []
  for (const def of jobDefs) {
    const job = await db.job.create({
      data: {
        title: def.title, description: def.description, trade: def.trade, category: def.category,
        budgetMin: def.budgetMin, budgetMax: def.budgetMax, location: def.location,
        city: def.city, state: def.state, duration: def.duration, crewSize: def.crewSize,
        urgency: def.urgency, contractorId: def.contractor.id, status: 'OPEN',
      },
    })
    jobs.push(job)
  }

  // Bids
  const bidDefs = [
    { jobIdx: 0, sub: subcontractors[0], amount: 36000, message: 'We can start within 5 days. Crew of 4 master electricians. Will meet your inspection timeline.', duration: '4 weeks' },
    { jobIdx: 1, sub: subcontractors[1], amount: 18500, message: 'Experienced with custom home rough-ins. PEX certified. Can mobilize next week.', duration: '3 weeks' },
    { jobIdx: 2, sub: subcontractors[3], amount: 104000, message: 'TPO specialists. Crew of 8 with crane operator. 20-year warranty included.', duration: '5 weeks' },
    { jobIdx: 3, sub: subcontractors[2], amount: 44500, message: 'Engineered truss experience. Crew of 6, on-time track record. References available.', duration: '3 weeks' },
    { jobIdx: 4, sub: subcontractors[4], amount: 41000, message: 'Own pump truck, no rental needed. Crew of 6. Can start Monday.', duration: '2 weeks' },
    { jobIdx: 5, sub: subcontractors[5], amount: 122000, message: 'NATE certified installers. Coordinated multi-phase install experience. References on request.', duration: '5 weeks' },
    { jobIdx: 6, sub: subcontractors[0], amount: 29500, message: 'Restaurant TI experience including hood interlocks. Available immediately.', duration: '3 weeks' },
    { jobIdx: 7, sub: subcontractors[1], amount: 31500, message: 'Trim-out specialists. 24-unit experience. Will coordinate inspections.', duration: '4 weeks' },
    { jobIdx: 0, sub: subcontractors[4], amount: 39500, message: 'Concrete crew available, but we do light electrical too. Backup option if needed.', duration: '4 weeks' },
  ]
  for (const b of bidDefs) {
    await db.bid.create({
      data: {
        amount: b.amount, message: b.message, duration: b.duration,
        jobId: jobs[b.jobIdx].id, subcontractorId: b.sub.id, status: 'PENDING',
      },
    })
  }

  // Reviews
  const reviewDefs = [
    { target: subcontractors[0], author: contractors[0], rating: 5, comment: 'Ray and his crew were on time every day and the inspection passed first try. Will hire again.' },
    { target: subcontractors[1], author: contractors[1], rating: 5, comment: 'Tasha\'s team did excellent work on our custom home. Clean, professional, communicative.' },
    { target: subcontractors[3], author: contractors[2], rating: 4, comment: 'Solid roofing job. Slight delay due to weather but they communicated throughout.' },
    { target: subcontractors[5], author: contractors[1], rating: 5, comment: 'Lena\'s HVAC crew is top notch. Complex install handled flawlessly.' },
    { target: contractors[0], author: subcontractors[0], rating: 5, comment: 'Marcus runs an organized site. Plans were clear and payment was on time.' },
  ]
  for (const r of reviewDefs) {
    await db.review.create({
      data: { authorId: r.author.id, targetId: r.target.id, rating: r.rating, comment: r.comment },
    })
  }

  // Seed a few notifications for the contractor (Marcus) so the bell has content
  await db.notification.deleteMany()
  await db.notification.createMany({
    data: [
      {
        userId: contractors[0].id,
        type: 'NEW_BID',
        title: 'New bid received 🛠️',
        body: `${subcontractors[0].name} bid $36,000 on "${jobs[0].title}".`,
        link: jobs[0].id,
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 15),
      },
      {
        userId: contractors[0].id,
        type: 'NEW_BID',
        title: 'New bid received 🛠️',
        body: `${subcontractors[4].name} bid $39,500 on "${jobs[0].title}".`,
        link: jobs[0].id,
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
      {
        userId: contractors[0].id,
        type: 'NEW_MESSAGE',
        title: `New message from ${subcontractors[0].name}`,
        body: 'Hi Marcus, I had a quick question about the panel location in the plans…',
        link: '',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
      },
      {
        userId: contractors[0].id,
        type: 'NEW_REVIEW',
        title: 'You received a 5-star review ⭐',
        body: `${subcontractors[0].name} left you a 5-star review. "Marcus runs an organized site…"`,
        link: contractors[0].id,
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
      {
        userId: subcontractors[0].id,
        type: 'BID_ACCEPTED',
        title: 'Bid accepted! 🎉',
        body: `Your bid on "${jobs[6].title}" was accepted by the contractor.`,
        link: jobs[6].id,
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        userId: subcontractors[0].id,
        type: 'NEW_MESSAGE',
        title: `New message from ${contractors[0].name}`,
        body: 'Hey Ray, are you available to walk the site next Tuesday?',
        link: '',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
      },
    ],
  })

  // Seed a conversation between Marcus and Ray
  const convo = await db.conversation.create({
    data: { userAId: contractors[0].id, userBId: subcontractors[0].id, jobId: jobs[0].id },
  })
  await db.message.createMany({
    data: [
      { conversationId: convo.id, senderId: subcontractors[0].id, body: 'Hi Marcus, I just placed a bid on your electrical build-out. Let me know if you want to walk the site.', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6) },
      { conversationId: convo.id, senderId: contractors[0].id, body: 'Hey Ray — thanks for the quick bid. Can you do a site walk Tuesday morning? Also, do you have capacity for a crew of 4?', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5) },
      { conversationId: convo.id, senderId: subcontractors[0].id, body: 'Tuesday morning works. Yes, crew of 4 master electricians. We can start within 5 days of contract.', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3) },
    ],
  })

  return NextResponse.json({ ok: true, contractors: contractors.length, subcontractors: subcontractors.length, jobs: jobs.length })
}
