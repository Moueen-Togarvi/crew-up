import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  // Rate limit: 2 seed requests per minute
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit({ key: `seed:${ip}`, max: 2, windowMs: 60_000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many seed requests. Try again later.' }, { status: 429 })
  }

  const seedSecret = process.env.SEED_SECRET
  if (!seedSecret) {
    return NextResponse.json({ error: 'Seed endpoint is disabled — set SEED_SECRET to enable' }, { status: 403 })
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${seedSecret}`) {
    return NextResponse.json({ error: 'Invalid seed secret' }, { status: 403 })
  }

  // wipe — run all deletes in a single transaction so nothing is left half-deleted
  await db.$transaction([
    db.message.deleteMany(),
    db.conversation.deleteMany(),
    db.review.deleteMany(),
    db.bid.deleteMany(),
    db.milestone.deleteMany(),
    db.favorite.deleteMany(),
    db.notification.deleteMany(),
    db.job.deleteMany(),
    db.subscription.deleteMany(),
    db.crewMember.deleteMany(),
    db.user.deleteMany(),
  ])

  const passwordHash = await bcrypt.hash(process.env.DEMO_PASSWORD || 'password123', 12)

  const now = Date.now()
  const day = 86_400_000

  // ─── Contractors (6) ───────────────────────────────────────────────
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
        emailVerified: new Date(now - 90 * day),
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
        emailVerified: new Date(now - 180 * day),
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
        emailVerified: new Date(now - 60 * day),
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-derek.png',
      },
    }),
    db.user.create({
      data: {
        email: 'nina@steelridge.com',
        passwordHash,
        name: 'Nina Patel',
        role: 'CONTRACTOR',
        company: 'Steel Ridge Builders',
        phone: '214-555-0310',
        city: 'Dallas', state: 'TX',
        bio: 'Multi-family and mixed-use developer in the DFW metroplex. 200+ units completed.',
        rating: 4.7, reviewCount: 38, jobsCompleted: 66, verified: true, plan: 'ENTERPRISE',
        emailVerified: new Date(now - 120 * day),
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-nina.png',
      },
    }),
    db.user.create({
      data: {
        email: 'tony@greenfieldgc.com',
        passwordHash,
        name: 'Tony Morales',
        role: 'CONTRACTOR',
        company: 'Greenfield General Contracting',
        phone: '505-555-0355',
        city: 'Albuquerque', state: 'NM',
        bio: 'Solar-ready commercial builds and tenant improvements across New Mexico.',
        rating: 4.4, reviewCount: 15, jobsCompleted: 28, verified: true, plan: 'PRO',
        emailVerified: new Date(now - 45 * day),
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-tony.png',
      },
    }),
    db.user.create({
      data: {
        email: 'kate@horizonconstruction.com',
        passwordHash,
        name: 'Kate Brennan',
        role: 'CONTRACTOR',
        company: 'Horizon Construction LLC',
        phone: '619-555-0420',
        city: 'San Diego', state: 'CA',
        bio: 'High-end residential remodels and ADU construction in Southern California.',
        rating: 4.5, reviewCount: 22, jobsCompleted: 40, verified: true, plan: 'PRO',
        emailVerified: new Date(now - 30 * day),
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-kate.png',
      },
    }),
  ])

  // ─── Subcontractors (9) ─────────────────────────────────────────────
  const subcontractors = await Promise.all([
    db.user.create({
      data: {
        email: 'ray@voltelectric.com', passwordHash, name: 'Ray Delgado', role: 'SUBCONTRACTOR',
        company: 'Volt Electric LLC', phone: '512-555-0210', city: 'Austin', state: 'TX',
        trade: 'Electrical', skills: 'Wiring,Panel Upgrades,Lighting,Inspections,EV Chargers', hourlyRate: 85,
        bio: 'Licensed master electrician. Commercial and residential. Available for multi-week engagements.',
        rating: 4.9, reviewCount: 41, jobsCompleted: 73, verified: true, plan: 'PRO',
        emailVerified: new Date(now - 90 * day),
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-ray.png',
      },
    }),
    db.user.create({
      data: {
        email: 'tasha@flowproplumbing.com', passwordHash, name: 'Tasha Brooks', role: 'SUBCONTRACTOR',
        company: 'FlowPro Plumbing', phone: '303-555-0233', city: 'Denver', state: 'CO',
        trade: 'Plumbing', skills: 'Rough-in,Fixtures,Repairs,Backflow,Water Heaters', hourlyRate: 78,
        bio: 'Full-service plumbing crew of 6. Fast turnaround on rough-ins and trim-out.',
        rating: 4.7, reviewCount: 28, jobsCompleted: 51, verified: true, plan: 'PRO',
        emailVerified: new Date(now - 60 * day),
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-tasha.png',
      },
    }),
    db.user.create({
      data: {
        email: 'jorge@irontreeframing.com', passwordHash, name: 'Jorge Mendoza', role: 'SUBCONTRACTOR',
        company: 'IronTree Framing', phone: '512-555-0244', city: 'San Antonio', state: 'TX',
        trade: 'Framing', skills: 'Wood Framing,Trusses,Decking,Sheathing', hourlyRate: 62,
        bio: 'Framing crew of 8. Custom homes and light commercial. We hit our schedules.',
        rating: 4.5, reviewCount: 19, jobsCompleted: 38, verified: false, plan: 'FREE',
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-jorge.png',
      },
    }),
    db.user.create({
      data: {
        email: 'priya@peakroofing.com', passwordHash, name: 'Priya Shah', role: 'SUBCONTRACTOR',
        company: 'Peak Roofing Solutions', phone: '602-555-0266', city: 'Phoenix', state: 'AZ',
        trade: 'Roofing', skills: 'Shingle,Metal,Flat Roof,Repairs,Gutters', hourlyRate: 70,
        bio: 'Roofing specialists. OSHA certified crew. Free estimates and 10-year workmanship warranty.',
        rating: 4.8, reviewCount: 33, jobsCompleted: 64, verified: true, plan: 'PRO',
        emailVerified: new Date(now - 75 * day),
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-priya.png',
      },
    }),
    db.user.create({
      data: {
        email: 'sam@solidgroundconcrete.com', passwordHash, name: 'Sam Whitaker', role: 'SUBCONTRACTOR',
        company: 'Solid Ground Concrete', phone: '512-555-0277', city: 'Austin', state: 'TX',
        trade: 'Concrete', skills: 'Foundations,Slabs,Driveways,Stamped,Pumping', hourlyRate: 68,
        bio: 'Flatwork and foundations. Crew of 10 with our own pump truck.',
        rating: 4.6, reviewCount: 22, jobsCompleted: 40, verified: true, plan: 'FREE',
        emailVerified: new Date(now - 30 * day),
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-sam.png',
      },
    }),
    db.user.create({
      data: {
        email: 'lena@climatehvacpros.com', passwordHash, name: 'Lena Fischer', role: 'SUBCONTRACTOR',
        company: 'Climate HVAC Pros', phone: '303-555-0288', city: 'Denver', state: 'CO',
        trade: 'HVAC', skills: 'Install,Service,Ductwork,Commercial,Mini-splits', hourlyRate: 92,
        bio: 'Commercial HVAC install and service. NATE certified techs on every job.',
        rating: 4.9, reviewCount: 47, jobsCompleted: 91, verified: true, plan: 'PRO',
        emailVerified: new Date(now - 120 * day),
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-lena.png',
      },
    }),
    db.user.create({
      data: {
        email: 'marco@finishlinedrywall.com', passwordHash, name: 'Marco Vega', role: 'SUBCONTRACTOR',
        company: 'Finish Line Drywall', phone: '214-555-0299', city: 'Dallas', state: 'TX',
        trade: 'Drywall', skills: 'Hanging,Taping,Finishing,Texture,Repairs', hourlyRate: 55,
        bio: 'Drywall crew of 12. Multi-family specialist — we finish buildings fast.',
        rating: 4.7, reviewCount: 35, jobsCompleted: 82, verified: true, plan: 'PRO',
        emailVerified: new Date(now - 90 * day),
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-marco.png',
      },
    }),
    db.user.create({
      data: {
        email: 'diana@colorcraftpainting.com', passwordHash, name: 'Diana Cruz', role: 'SUBCONTRACTOR',
        company: 'ColorCraft Painting', phone: '619-555-0311', city: 'San Diego', state: 'CA',
        trade: 'Painting', skills: 'Interior,Exterior,Spray,Staining,Cabinet Refinishing', hourlyRate: 50,
        bio: 'Interior/exterior painting crew of 8. Residential and commercial. Licensed and insured.',
        rating: 4.8, reviewCount: 29, jobsCompleted: 56, verified: true, plan: 'PRO',
        emailVerified: new Date(now - 45 * day),
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-diana.png',
      },
    }),
    db.user.create({
      data: {
        email: 'ben@ironcladwelding.com', passwordHash, name: 'Ben Hartley', role: 'SUBCONTRACTOR',
        company: 'Ironclad Welding & Steel', phone: '505-555-0322', city: 'Albuquerque', state: 'NM',
        trade: 'Welding', skills: 'MIG,TIG,Structural,Handrails,Ornamental', hourlyRate: 75,
        bio: 'AWS certified welder. Structural steel, handrails, and custom fabrication.',
        rating: 4.6, reviewCount: 18, jobsCompleted: 30, verified: true, plan: 'FREE',
        emailVerified: new Date(now - 15 * day),
        avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/avatar-ben.png',
      },
    }),
  ])

  // ─── Subscriptions ──────────────────────────────────────────────────
  const allUsers = [...contractors, ...subcontractors]
  for (const u of allUsers) {
    await db.subscription.create({
      data: { userId: u.id, plan: u.plan, status: 'ACTIVE', currentPeriodEnd: new Date(now + day * 30) },
    })
  }

  // ─── Jobs (15) ──────────────────────────────────────────────────────
  const jobDefs = [
    // Marcus (Austin)
    { title: 'Commercial Office Build-Out — Electrical', description: 'Full electrical for a 12,000 sqft office build-out in north Austin. Includes panel, lighting, data drops, and final inspection. Plans available. Need a crew of 3-4 for roughly 4 weeks.', trade: 'Electrical', category: 'Commercial', budgetMin: 28000, budgetMax: 42000, location: 'North Austin, TX', city: 'Austin', state: 'TX', duration: '3-4 weeks', crewSize: 4, urgency: 'URGENT', status: 'OPEN', contractor: contractors[0] },
    { title: 'Foundation & Slab — Retail Shell', description: 'Pour foundation and slab for a 8,000 sqft retail shell. Site work complete, ready to form. Need crew with pump capability. Rebar and materials supplied.', trade: 'Concrete', category: 'Commercial', budgetMin: 32000, budgetMax: 48000, location: 'Round Rock, TX', city: 'Austin', state: 'TX', duration: '2 weeks', crewSize: 6, urgency: 'URGENT', status: 'OPEN', contractor: contractors[0] },
    { title: 'Multi-Family — Plumbing Trim-Out', description: 'Plumbing trim-out for a 24-unit apartment building. Fixtures, final connections, and inspection coordination. Rough-in complete.', trade: 'Plumbing', category: 'Residential', budgetMin: 26000, budgetMax: 38000, location: 'Lakeway, TX', city: 'Austin', state: 'TX', duration: '4 weeks', crewSize: 4, urgency: 'STANDARD', status: 'OPEN', contractor: contractors[0] },
    // Elena (Denver)
    { title: 'Custom Home — Rough Plumbing', description: 'Rough-in plumbing for a 4,200 sqft custom home in the foothills. PEX throughout, 4 baths, kitchen, laundry, and bar. Need completion before drywall phase in 3 weeks.', trade: 'Plumbing', category: 'Residential', budgetMin: 14000, budgetMax: 22000, location: 'Evergreen, CO', city: 'Denver', state: 'CO', duration: '2-3 weeks', crewSize: 3, urgency: 'STANDARD', status: 'ASSIGNED', assignedTo: subcontractors[1], contractor: contractors[1] },
    { title: 'Residential — Wood Framing Package', description: 'Complete framing package for a two-story 3,500 sqft home. Includes floors, walls, roof trusses, and sheathing. Materials on site. Plans engineered.', trade: 'Framing', category: 'Residential', budgetMin: 38000, budgetMax: 52000, location: 'Boulder, CO', city: 'Denver', state: 'CO', duration: '3 weeks', crewSize: 6, urgency: 'FLEXIBLE', status: 'ASSIGNED', assignedTo: subcontractors[2], contractor: contractors[1] },
    { title: 'Office Tower — HVAC Installation', description: 'Install 4 rooftop units and run all ductwork for a 3-story office building. Equipment delivered. Need coordinated install with general contractor over 5 weeks.', trade: 'HVAC', category: 'Commercial', budgetMin: 95000, budgetMax: 140000, location: 'Downtown Denver, CO', city: 'Denver', state: 'CO', duration: '5 weeks', crewSize: 5, urgency: 'STANDARD', status: 'OPEN', contractor: contractors[1] },
    // Derek (Phoenix)
    { title: 'Warehouse — Roof Replacement', description: 'Tear off and replace 30,000 sqft flat roof on a distribution warehouse. Two layers existing. New TPO system with 20-year warranty preferred. Crane access available.', trade: 'Roofing', category: 'Industrial', budgetMin: 85000, budgetMax: 120000, location: 'West Phoenix, AZ', city: 'Phoenix', state: 'AZ', duration: '4-6 weeks', crewSize: 8, urgency: 'STANDARD', status: 'ASSIGNED', assignedTo: subcontractors[3], contractor: contractors[2] },
    { title: 'Restaurant Build-Out — Full Electrical', description: 'Tenant improvement for a new restaurant. Heavy kitchen loads, hood interlocks, dining lighting. Plans stamped. Health dept inspection in 6 weeks.', trade: 'Electrical', category: 'Commercial', budgetMin: 22000, budgetMax: 34000, location: 'Tempe, AZ', city: 'Phoenix', state: 'AZ', duration: '3 weeks', crewSize: 3, urgency: 'URGENT', status: 'OPEN', contractor: contractors[2] },
    { title: 'Shopping Center — Structural Steel Handrails', description: 'Fabricate and install 400 LF of ADA-compliant steel handrails and guards for a retail shopping center renovation. MIG welding on site.', trade: 'Welding', category: 'Commercial', budgetMin: 18000, budgetMax: 26000, location: 'Scottsdale, AZ', city: 'Phoenix', state: 'AZ', duration: '2-3 weeks', crewSize: 3, urgency: 'FLEXIBLE', status: 'OPEN', contractor: contractors[2] },
    // Nina (Dallas)
    { title: 'Apartment Complex — Drywall Scope', description: 'Full drywall scope for 36-unit garden apartment building. Hang, tape, finish (Level 4), and prime all units plus common areas.', trade: 'Drywall', category: 'Residential', budgetMin: 72000, budgetMax: 95000, location: 'Plano, TX', city: 'Dallas', state: 'TX', duration: '6 weeks', crewSize: 10, urgency: 'URGENT', status: 'ASSIGNED', assignedTo: subcontractors[6], contractor: contractors[3] },
    { title: 'Townhome Community — Painting', description: 'Exterior painting for 18 townhomes. HOA-approved color scheme. Includes stucco prep, trim, and doors. Two coats minimum.', trade: 'Painting', category: 'Residential', budgetMin: 45000, budgetMax: 62000, location: 'Frisco, TX', city: 'Dallas', state: 'TX', duration: '3-4 weeks', crewSize: 6, urgency: 'STANDARD', status: 'OPEN', contractor: contractors[3] },
    // Tony (Albuquerque)
    { title: 'Solar Farm — Structural Steel Platform', description: 'Build elevated steel platforms and mounting racks for a 5MW solar installation. AWS D1.1 certified welders required. Plans stamped by PE.', trade: 'Welding', category: 'Industrial', budgetMin: 110000, budgetMax: 150000, location: 'Los Lunas, NM', city: 'Albuquerque', state: 'NM', duration: '6-8 weeks', crewSize: 8, urgency: 'STANDARD', status: 'OPEN', contractor: contractors[4] },
    // Kate (San Diego)
    { title: 'Luxury Home Remodel — Full Paint', description: 'Interior repaint for a 5,000 sqft luxury home. Includes cabinets, trim, accent walls, and exterior stucco touch-up. High-end finishes expected.', trade: 'Painting', category: 'Residential', budgetMin: 28000, budgetMax: 38000, location: 'La Jolla, CA', city: 'San Diego', state: 'CA', duration: '3 weeks', crewSize: 4, urgency: 'FLEXIBLE', status: 'OPEN', contractor: contractors[5] },
    { title: 'ADU Build — Electrical & Plumbing', description: 'Need both electrical and plumbing rough-in for a 1,200 sqft detached ADU. Panel upgrade for main house included. Permits pulled.', trade: 'Electrical', category: 'Residential', budgetMin: 18000, budgetMax: 26000, location: 'Coronado, CA', city: 'San Diego', state: 'CA', duration: '2-3 weeks', crewSize: 3, urgency: 'STANDARD', status: 'OPEN', contractor: contractors[5] },
  ]

  const jobs = []
  for (const def of jobDefs) {
    const job = await db.job.create({
      data: {
        title: def.title,
        description: def.description,
        trade: def.trade,
        category: def.category,
        budgetMin: def.budgetMin,
        budgetMax: def.budgetMax,
        location: def.location,
        city: def.city,
        state: def.state,
        duration: def.duration,
        crewSize: def.crewSize,
        urgency: def.urgency,
        status: def.status,
        contractorId: def.contractor.id,
        assignedToId: def.assignedTo?.id ?? null,
      },
    })
    jobs.push(job)
  }

  // ─── Bids (25+) ─────────────────────────────────────────────────────
  const bidDefs = [
    // Job 0: Commercial Office Electrical (Marcus)
    { jobIdx: 0, sub: subcontractors[0], amount: 36000, message: 'We can start within 5 days. Crew of 4 master electricians. Will meet your inspection timeline.', duration: '4 weeks', status: 'PENDING' },
    { jobIdx: 0, sub: subcontractors[4], amount: 39500, message: 'We do light electrical too. Available next week.', duration: '4 weeks', status: 'PENDING' },
    // Job 1: Foundation & Slab (Marcus)
    { jobIdx: 1, sub: subcontractors[4], amount: 41000, message: 'Own pump truck, no rental needed. Crew of 6. Can start Monday.', duration: '2 weeks', status: 'PENDING' },
    // Job 2: Multi-Family Plumbing (Marcus)
    { jobIdx: 2, sub: subcontractors[1], amount: 31500, message: 'Trim-out specialists. 24-unit experience. Will coordinate inspections.', duration: '4 weeks', status: 'PENDING' },
    // Job 3: Custom Home Rough Plumbing (Elena) — ASSIGNED
    { jobIdx: 3, sub: subcontractors[1], amount: 18500, message: 'Experienced with custom home rough-ins. PEX certified. Can mobilize next week.', duration: '3 weeks', status: 'ACCEPTED' },
    { jobIdx: 3, sub: subcontractors[4], amount: 20000, message: 'Can handle both plumbing and concrete on this site.', duration: '3 weeks', status: 'REJECTED' },
    // Job 4: Residential Framing (Elena) — ASSIGNED
    { jobIdx: 4, sub: subcontractors[2], amount: 44500, message: 'Engineered truss experience. Crew of 6, on-time track record. References available.', duration: '3 weeks', status: 'ACCEPTED' },
    { jobIdx: 4, sub: subcontractors[0], amount: 47500, message: 'We also do framing — crew available.', duration: '3 weeks', status: 'REJECTED' },
    // Job 5: HVAC (Elena)
    { jobIdx: 5, sub: subcontractors[5], amount: 122000, message: 'NATE certified installers. Coordinated multi-phase install experience. References on request.', duration: '5 weeks', status: 'PENDING' },
    // Job 6: Warehouse Roof (Derek) — ASSIGNED
    { jobIdx: 6, sub: subcontractors[3], amount: 104000, message: 'TPO specialists. Crew of 8 with crane operator. 20-year warranty included.', duration: '5 weeks', status: 'ACCEPTED' },
    { jobIdx: 6, sub: subcontractors[2], amount: 118000, message: 'Can provide a full crew with crane coordination.', duration: '6 weeks', status: 'REJECTED' },
    // Job 7: Restaurant Electrical (Derek)
    { jobIdx: 7, sub: subcontractors[0], amount: 29500, message: 'Restaurant TI experience including hood interlocks. Available immediately.', duration: '3 weeks', status: 'PENDING' },
    // Job 8: Structural Steel Handrails (Derek)
    { jobIdx: 8, sub: subcontractors[8], amount: 22000, message: 'AWS D1.1 certified. 400+ LF handrail experience. Can fabricate off-site.', duration: '3 weeks', status: 'PENDING' },
    { jobIdx: 8, sub: subcontractors[0], amount: 25000, message: 'We can handle the electrical portion of this project.', duration: '2 weeks', status: 'PENDING' },
    // Job 9: Drywall Scope (Nina) — ASSIGNED
    { jobIdx: 9, sub: subcontractors[6], amount: 84000, message: 'Crew of 12. Multi-family is our bread and butter. Level 4 finish guaranteed.', duration: '6 weeks', status: 'ACCEPTED' },
    { jobIdx: 9, sub: subcontractors[4], amount: 92000, message: 'Can provide labor support for the foundation portions.', duration: '7 weeks', status: 'REJECTED' },
    // Job 10: Townhome Painting (Nina)
    { jobIdx: 10, sub: subcontractors[7], amount: 53000, message: 'Exterior specialist crew of 8. HOA-compliant experience. Spray + brush/roll combo.', duration: '4 weeks', status: 'PENDING' },
    { jobIdx: 10, sub: subcontractors[4], amount: 58000, message: 'We do some exterior work too.', duration: '5 weeks', status: 'PENDING' },
    // Job 11: Solar Farm Steel (Tony)
    { jobIdx: 11, sub: subcontractors[8], amount: 125000, message: 'AWS D1.1 certified crew. Structural steel platforms are our specialty. Have worked on 3 solar farms.', duration: '7 weeks', status: 'PENDING' },
    // Job 12: Luxury Home Paint (Kate)
    { jobIdx: 12, sub: subcontractors[7], amount: 34000, message: 'High-end residential is our focus. Cabinet finishing is our specialty. References in La Jolla.', duration: '3 weeks', status: 'PENDING' },
    // Job 13: ADU Electrical (Kate)
    { jobIdx: 13, sub: subcontractors[0], amount: 21000, message: 'ADU and panel upgrade specialist. Can start in 5 days.', duration: '2 weeks', status: 'PENDING' },
    { jobIdx: 13, sub: subcontractors[1], amount: 23000, message: 'Can coordinate both electrical and plumbing for this ADU.', duration: '3 weeks', status: 'PENDING' },
  ]

  for (const b of bidDefs) {
    await db.bid.create({
      data: {
        amount: b.amount,
        message: b.message,
        duration: b.duration,
        jobId: jobs[b.jobIdx].id,
        subcontractorId: b.sub.id,
        status: b.status,
        createdAt: new Date(now - Math.random() * 7 * day),
      },
    })
  }

  // ─── Reviews (12) ──────────────────────────────────────────────────
  const reviewDefs = [
    { target: subcontractors[0], author: contractors[0], rating: 5, comment: 'Ray and his crew were on time every day and the inspection passed first try. Will hire again.', jobId: jobs[0].id },
    { target: subcontractors[1], author: contractors[1], rating: 5, comment: 'Tasha\'s team did excellent work on our custom home. Clean, professional, communicative.', jobId: jobs[3].id },
    { target: subcontractors[3], author: contractors[2], rating: 4, comment: 'Solid roofing job. Slight delay due to weather but they communicated throughout.', jobId: jobs[6].id },
    { target: subcontractors[5], author: contractors[1], rating: 5, comment: 'Lena\'s HVAC crew is top notch. Complex install handled flawlessly.', jobId: jobs[5].id },
    { target: contractors[0], author: subcontractors[0], rating: 5, comment: 'Marcus runs an organized site. Plans were clear and payment was on time.', jobId: jobs[0].id },
    { target: subcontractors[2], author: contractors[1], rating: 5, comment: 'Jorge\'s framing crew hit every milestone on schedule. Great craftsmanship on a complex roofline.', jobId: jobs[4].id },
    { target: subcontractors[6], author: contractors[3], rating: 5, comment: 'Marco and his crew finished our 36-unit drywall scope ahead of schedule. Level 4 finish throughout.', jobId: jobs[9].id },
    { target: subcontractors[7], author: contractors[5], rating: 5, comment: 'Diana\'s painting crew delivered a flawless finish on our luxury remodel. Cabinet work was impeccable.', jobId: jobs[12].id },
    { target: contractors[1], author: subcontractors[1], rating: 5, comment: 'Elena is a pleasure to work for. Detailed plans, fair timelines, and payments always on time.', jobId: jobs[3].id },
    { target: subcontractors[8], author: contractors[4], rating: 4, comment: 'Ben did quality welding on our platforms. Minor punch list items resolved quickly.', jobId: jobs[11].id },
    { target: contractors[3], author: subcontractors[6], rating: 5, comment: 'Nina provides excellent project coordination. Clear specs and responsive communication.', jobId: jobs[9].id },
    { target: subcontractors[0], author: contractors[2], rating: 5, comment: 'Ray handled our restaurant TI without a hitch. Passed health inspection on first go.', jobId: jobs[7].id },
  ]
  for (const r of reviewDefs) {
    await db.review.create({
      data: {
        authorId: r.author.id,
        targetId: r.target.id,
        jobId: r.jobId,
        rating: r.rating,
        comment: r.comment,
        createdAt: new Date(now - Math.random() * 30 * day),
      },
    })
  }

  // ─── Milestones (for assigned jobs) ────────────────────────────────
  const milestoneDefs = [
    // Job 3: Custom Home Rough Plumbing
    { jobId: 3, title: 'Rough-in — Main Level', description: 'PEX supply and drain lines for first floor', dueOffset: 7, order: 0 },
    { jobId: 3, title: 'Rough-in — Upper Level', description: 'PEX supply and drain lines for second floor and baths', dueOffset: 14, order: 1 },
    { jobId: 3, title: 'Rough-in — Kitchen & Bar', description: 'Supply lines, drain, and gas stub-out for kitchen', dueOffset: 17, order: 2 },
    { jobId: 3, title: 'Rough Inspection', description: 'Coordinate with county inspector for rough-in sign-off', dueOffset: 21, order: 3 },
    // Job 4: Residential Framing
    { jobId: 4, title: 'Floor System', description: 'Install floor joists and subfloor decking', dueOffset: 5, order: 0, completed: true, completedAt: new Date(now - 12 * day) },
    { jobId: 4, title: 'First Floor Walls', description: 'Frame exterior and interior walls on main level', dueOffset: 10, order: 1, completed: true, completedAt: new Date(now - 8 * day) },
    { jobId: 4, title: 'Second Floor System', description: 'Second floor joists and sheathing', dueOffset: 14, order: 2 },
    { jobId: 4, title: 'Roof Trusses & Sheathing', description: 'Set trusses, install sheathing, and hurricane ties', dueOffset: 21, order: 3 },
    // Job 6: Warehouse Roof
    { jobId: 6, title: 'Tear-Off', description: 'Remove existing two layers of roofing material', dueOffset: 10, order: 0, completed: true, completedAt: new Date(now - 14 * day) },
    { jobId: 6, title: 'Deck Preparation', description: 'Inspect and repair substrate, install TPO base sheet', dueOffset: 20, order: 1 },
    { jobId: 6, title: 'TPO Membrane Install', description: 'Fully adhered 60-mil TPO membrane system', dueOffset: 35, order: 2 },
    { jobId: 6, title: 'Flashing & Details', description: 'Penetration flashing, edge metal, and terminations', dueOffset: 38, order: 3 },
    { jobId: 6, title: 'Final Inspection', description: 'Manufacturer warranty inspection and sign-off', dueOffset: 42, order: 4 },
    // Job 9: Drywall Scope
    { jobId: 9, title: 'Hang — Buildings A & B', description: 'Install drywall on first 18 units', dueOffset: 14, order: 0, completed: true, completedAt: new Date(now - 10 * day) },
    { jobId: 9, title: 'Hang — Buildings C & D', description: 'Install drywall on remaining 18 units', dueOffset: 21, order: 1, completed: true, completedAt: new Date(now - 3 * day) },
    { jobId: 9, title: 'Tape & Finish — All Units', description: 'Level 4 finish on all 36 units plus common areas', dueOffset: 35, order: 2 },
    { jobId: 9, title: 'Prime & Punch List', description: 'Prime all surfaces, complete punch list items', dueOffset: 42, order: 3 },
  ]
  for (const m of milestoneDefs) {
    await db.milestone.create({
      data: {
        jobId: jobs[m.jobId].id,
        title: m.title,
        description: m.description || null,
        dueOffset: m.dueOffset,
        completed: m.completed ?? false,
        completedAt: m.completedAt ?? null,
        order: m.order,
      },
    })
  }

  // ─── Crew Members ───────────────────────────────────────────────────
  const crewDefs = [
    // Ray's crew (Volt Electric)
    { owner: subcontractors[0], name: 'Carlos Gutierrez', role: 'Foreman', trade: 'Electrical', phone: '512-555-1001', hourlyRate: 72, status: 'ACTIVE' },
    { owner: subcontractors[0], name: 'Devon Wright', role: 'Lead Electrician', trade: 'Electrical', phone: '512-555-1002', hourlyRate: 65, status: 'ON_JOB' },
    { owner: subcontractors[0], name: 'Jake Monroe', role: 'Apprentice', trade: 'Electrical', phone: '512-555-1003', hourlyRate: 38, status: 'ACTIVE' },
    { owner: subcontractors[0], name: 'Luis Reyes', role: 'Electrician', trade: 'Electrical', phone: '512-555-1004', hourlyRate: 58, status: 'ACTIVE' },
    // Tasha's crew (FlowPro)
    { owner: subcontractors[1], name: 'Kevin Brown', role: 'Foreman', trade: 'Plumbing', phone: '303-555-2001', hourlyRate: 68, status: 'ON_JOB' },
    { owner: subcontractors[1], name: 'Miguel Santos', role: 'Lead Plumber', trade: 'Plumbing', phone: '303-555-2002', hourlyRate: 60, status: 'ACTIVE' },
    { owner: subcontractors[1], name: 'Tyler James', role: 'Plumber', trade: 'Plumbing', phone: '303-555-2003', hourlyRate: 52, status: 'ACTIVE' },
    // Lena's crew (Climate HVAC)
    { owner: subcontractors[5], name: 'Ryan Choi', role: 'Foreman', trade: 'HVAC', phone: '303-555-3001', hourlyRate: 80, status: 'ACTIVE' },
    { owner: subcontractors[5], name: 'Derek Washington', role: 'Lead Installer', trade: 'HVAC', phone: '303-555-3002', hourlyRate: 72, status: 'ON_JOB' },
    { owner: subcontractors[5], name: 'Ethan Park', role: 'HVAC Tech', trade: 'HVAC', phone: '303-555-3003', hourlyRate: 62, status: 'ACTIVE' },
    { owner: subcontractors[5], name: 'Sam Cooper', role: 'Sheet Metal', trade: 'HVAC', phone: '303-555-3004', hourlyRate: 55, status: 'UNAVAILABLE' },
    // Marco's crew (Finish Line Drywall)
    { owner: subcontractors[6], name: 'Oscar Ramirez', role: 'Foreman', trade: 'Drywall', phone: '214-555-4001', hourlyRate: 48, status: 'ON_JOB' },
    { owner: subcontractors[6], name: 'Diego Torres', role: 'Hanger', trade: 'Drywall', phone: '214-555-4002', hourlyRate: 40, status: 'ACTIVE' },
    { owner: subcontractors[6], name: 'Chris Nguyen', role: 'Finisher', trade: 'Drywall', phone: '214-555-4003', hourlyRate: 45, status: 'ACTIVE' },
    // Diana's crew (ColorCraft)
    { owner: subcontractors[7], name: 'Mia Johnson', role: 'Foreman', trade: 'Painting', phone: '619-555-5001', hourlyRate: 44, status: 'ACTIVE' },
    { owner: subcontractors[7], name: 'Alex Rivera', role: 'Painter', trade: 'Painting', phone: '619-555-5002', hourlyRate: 38, status: 'ACTIVE' },
    { owner: subcontractors[7], name: 'Jordan Lee', role: 'Painter', trade: 'Painting', phone: '619-555-5003', hourlyRate: 36, status: 'ACTIVE' },
    // Ben's crew (Ironclad)
    { owner: subcontractors[8], name: 'Rusty Keller', role: 'Welder', trade: 'Welding', phone: '505-555-6001', hourlyRate: 62, status: 'ACTIVE' },
  ]
  for (const c of crewDefs) {
    await db.crewMember.create({
      data: {
        ownerUserId: c.owner.id,
        name: c.name,
        role: c.role,
        trade: c.trade || null,
        phone: c.phone || null,
        hourlyRate: c.hourlyRate ?? null,
        status: c.status,
      },
    })
  }

  // ─── Favorites ─────────────────────────────────────────────────────
  await db.favorite.createMany({
    data: [
      // Ray favorited Marcus's jobs
      { userId: subcontractors[0].id, jobId: jobs[0].id },
      { userId: subcontractors[0].id, jobId: jobs[7].id },
      // Tasha favorited Elena's jobs
      { userId: subcontractors[1].id, jobId: jobs[5].id },
      // Marcus favorited Ray and Tasha
      { userId: contractors[0].id, targetUserId: subcontractors[0].id },
      { userId: contractors[0].id, targetUserId: subcontractors[1].id },
      // Elena favorited Lena and Jorge
      { userId: contractors[1].id, targetUserId: subcontractors[5].id },
      { userId: contractors[1].id, targetUserId: subcontractors[2].id },
      // Sam favorited some jobs
      { userId: subcontractors[4].id, jobId: jobs[1].id },
      { userId: subcontractors[4].id, jobId: jobs[2].id },
      // Diana favorited Kate's jobs
      { userId: subcontractors[7].id, jobId: jobs[12].id },
      { userId: subcontractors[7].id, jobId: jobs[13].id },
    ],
  })

  // ─── Notifications (for multiple users) ──────────────────────────────
  await db.notification.createMany({
    data: [
      // Marcus notifications
      { userId: contractors[0].id, type: 'NEW_BID', title: 'New bid received 🛠️', body: `${subcontractors[0].name} bid $36,000 on "${jobs[0].title}".`, link: jobs[0].id, read: false, createdAt: new Date(now - 15 * 60 * 1000) },
      { userId: contractors[0].id, type: 'NEW_BID', title: 'New bid received 🛠️', body: `${subcontractors[4].name} bid $39,500 on "${jobs[0].title}".`, link: jobs[0].id, read: false, createdAt: new Date(now - 2 * 60 * 60 * 1000) },
      { userId: contractors[0].id, type: 'NEW_BID', title: 'New bid received 🛠️', body: `${subcontractors[4].name} bid $41,000 on "${jobs[1].title}".`, link: jobs[1].id, read: true, createdAt: new Date(now - 3 * 60 * 60 * 1000) },
      { userId: contractors[0].id, type: 'NEW_BID', title: 'New bid received 🛠️', body: `${subcontractors[1].name} bid $31,500 on "${jobs[2].title}".`, link: jobs[2].id, read: false, createdAt: new Date(now - 8 * 60 * 60 * 1000) },
      { userId: contractors[0].id, type: 'NEW_MESSAGE', title: `New message from ${subcontractors[0].name}`, body: 'Hi Marcus, I had a quick question about the panel location in the plans…', link: '', read: false, createdAt: new Date(now - 5 * 60 * 60 * 1000) },
      { userId: contractors[0].id, type: 'NEW_REVIEW', title: 'You received a 5-star review ⭐', body: `${subcontractors[0].name} left you a 5-star review. "Marcus runs an organized site…"`, link: contractors[0].id, read: true, createdAt: new Date(now - 24 * 60 * 60 * 1000) },
      // Elena notifications
      { userId: contractors[1].id, type: 'BID_ACCEPTED', title: 'Bid accepted! 🎉', body: `You accepted ${subcontractors[1].name}'s bid on "${jobs[3].title}".`, link: jobs[3].id, read: true, createdAt: new Date(now - 48 * 60 * 60 * 1000) },
      { userId: contractors[1].id, type: 'NEW_BID', title: 'New bid received 🛠️', body: `${subcontractors[5].name} bid $122,000 on "${jobs[5].title}".`, link: jobs[5].id, read: false, createdAt: new Date(now - 4 * 60 * 60 * 1000) },
      { userId: contractors[1].id, type: 'NEW_REVIEW', title: 'You received a 5-star review ⭐', body: `${subcontractors[1].name} left you a review. "Elena is a pleasure to work for…"`, link: contractors[1].id, read: false, createdAt: new Date(now - 12 * 60 * 60 * 1000) },
      // Ray notifications
      { userId: subcontractors[0].id, type: 'BID_ACCEPTED', title: 'Bid accepted! 🎉', body: `Your bid on "${jobs[0].title}" was accepted by the contractor.`, link: jobs[0].id, read: false, createdAt: new Date(now - 30 * 60 * 1000) },
      { userId: subcontractors[0].id, type: 'NEW_MESSAGE', title: `New message from ${contractors[0].name}`, body: 'Hey Ray, are you available to walk the site next Tuesday?', link: '', read: false, createdAt: new Date(now - 3 * 60 * 60 * 1000) },
      { userId: subcontractors[0].id, type: 'JOB_ASSIGNED', title: 'New job assigned! 🔧', body: `You\'ve been assigned to "${jobs[7].title}". Check the details and schedule.`, link: jobs[7].id, read: false, createdAt: new Date(now - 60 * 60 * 1000) },
      // Derek notifications
      { userId: contractors[2].id, type: 'NEW_BID', title: 'New bid received 🛠️', body: `${subcontractors[0].name} bid $29,500 on "${jobs[7].title}".`, link: jobs[7].id, read: true, createdAt: new Date(now - 6 * 60 * 60 * 1000) },
      { userId: contractors[2].id, type: 'NEW_BID', title: 'New bid received 🛠️', body: `${subcontractors[8].name} bid $22,000 on "${jobs[8].title}".`, link: jobs[8].id, read: false, createdAt: new Date(now - 2 * 60 * 60 * 1000) },
      // Nina notifications
      { userId: contractors[3].id, type: 'BID_ACCEPTED', title: 'Bid accepted! 🎉', body: `You accepted ${subcontractors[6].name}'s bid on "${jobs[9].title}".`, link: jobs[9].id, read: true, createdAt: new Date(now - 72 * 60 * 60 * 1000) },
      { userId: contractors[3].id, type: 'NEW_BID', title: 'New bid received 🛠️', body: `${subcontractors[7].name} bid $53,000 on "${jobs[10].title}".`, link: jobs[10].id, read: false, createdAt: new Date(now - 5 * 60 * 60 * 1000) },
      // Tasha notifications
      { userId: subcontractors[1].id, type: 'JOB_ASSIGNED', title: 'New job assigned! 🔧', body: `You\'ve been assigned to "${jobs[3].title}". Start date is next Monday.`, link: jobs[3].id, read: true, createdAt: new Date(now - 48 * 60 * 60 * 1000) },
      { userId: subcontractors[1].id, type: 'NEW_MESSAGE', title: `New message from ${contractors[1].name}`, body: 'Tasha, can you confirm your crew size for the Evergreen project?', link: '', read: false, createdAt: new Date(now - 60 * 60 * 1000) },
    ],
  })

  // ─── Conversations (4) ───────────────────────────────────────────────
  // Convo 1: Marcus ↔ Ray (about job 0)
  const convo1 = await db.conversation.create({
    data: { userAId: contractors[0].id, userBId: subcontractors[0].id, jobId: jobs[0].id },
  })
  await db.message.createMany({
    data: [
      { conversationId: convo1.id, senderId: subcontractors[0].id, body: 'Hi Marcus, I just placed a bid on your electrical build-out. Let me know if you want to walk the site.', createdAt: new Date(now - 6 * 60 * 60 * 1000) },
      { conversationId: convo1.id, senderId: contractors[0].id, body: 'Hey Ray — thanks for the quick bid. Can you do a site walk Tuesday morning? Also, do you have capacity for a crew of 4?', createdAt: new Date(now - 5 * 60 * 60 * 1000) },
      { conversationId: convo1.id, senderId: subcontractors[0].id, body: 'Tuesday morning works. Yes, crew of 4 master electricians. We can start within 5 days of contract.', createdAt: new Date(now - 3 * 60 * 60 * 1000) },
      { conversationId: convo1.id, senderId: contractors[0].id, body: 'Perfect. I\'ll send over the full plans tonight. Can you review and confirm the panel spec?', createdAt: new Date(now - 2 * 60 * 60 * 1000) },
      { conversationId: convo1.id, senderId: subcontractors[0].id, body: 'Will do. I noticed the plans show a 200A main — we may want to discuss a 400A upgrade given the load schedule. I\'ll include notes with my review.', createdAt: new Date(now - 60 * 60 * 1000) },
    ],
  })

  // Convo 2: Elena ↔ Tasha (about job 3 — assigned)
  const convo2 = await db.conversation.create({
    data: { userAId: contractors[1].id, userBId: subcontractors[1].id, jobId: jobs[3].id },
  })
  await db.message.createMany({
    data: [
      { conversationId: convo2.id, senderId: contractors[1].id, body: 'Tasha, great news — we\'re moving forward with your bid on the Evergreen custom home. When can your crew mobilize?', createdAt: new Date(now - 96 * 60 * 60 * 1000) },
      { conversationId: convo2.id, senderId: subcontractors[1].id, body: 'Excited to get started! My crew of 3 can be on-site Monday. I\'ve already ordered the PEX and fittings.', createdAt: new Date(now - 95 * 60 * 60 * 1000) },
      { conversationId: convo2.id, senderId: contractors[1].id, body: 'Monday works. The framing crew is about 2 weeks from finishing, so you\'ll have clear access to all areas. I\'ll email the updated fixture schedule.', createdAt: new Date(now - 94 * 60 * 60 * 1000) },
      { conversationId: convo2.id, senderId: subcontractors[1].id, body: 'Sounds good. Quick question — the plans show a tankless water heater. Do you have a preferred brand, or should I spec a Rinnai?', createdAt: new Date(now - 48 * 60 * 60 * 1000) },
    ],
  })

  // Convo 3: Derek ↔ Priya (about job 6 — assigned)
  const convo3 = await db.conversation.create({
    data: { userAId: contractors[2].id, userBId: subcontractors[3].id, jobId: jobs[6].id },
  })
  await db.message.createMany({
    data: [
      { conversationId: convo3.id, senderId: contractors[2].id, body: 'Priya, tear-off is complete on the warehouse. Your crew can start the deck prep Monday.', createdAt: new Date(now - 24 * 60 * 60 * 1000) },
      { conversationId: convo3.id, senderId: subcontractors[3].id, body: 'Perfect. We\'ll have the full crew of 8 on-site by 7am. Crane will arrive Tuesday for the membrane rolls.', createdAt: new Date(now - 20 * 60 * 60 * 1000) },
      { conversationId: convo3.id, senderId: contractors[2].id, body: 'Great. I\'ll make sure the electrician has the panels de-energized on your side by Monday.', createdAt: new Date(now - 12 * 60 * 60 * 1000) },
    ],
  })

  // Convo 4: Nina ↔ Marco (about job 9 — assigned)
  const convo4 = await db.conversation.create({
    data: { userAId: contractors[3].id, userBId: subcontractors[6].id, jobId: jobs[9].id },
  })
  await db.message.createMany({
    data: [
      { conversationId: convo4.id, senderId: contractors[3].id, body: 'Marco, how\'s the hang progressing? The framer says Buildings C & D should be ready for drywall by Thursday.', createdAt: new Date(now - 3 * 60 * 60 * 1000) },
      { conversationId: convo4.id, senderId: subcontractors[6].id, body: 'We\'re finishing up Buildings A & B today. My second crew will start on C & D Thursday morning. We\'re on schedule.', createdAt: new Date(now - 2 * 60 * 60 * 1000) },
    ],
  })

  return NextResponse.json({
    ok: true,
    contractors: contractors.length,
    subcontractors: subcontractors.length,
    jobs: jobs.length,
    bids: bidDefs.length,
    reviews: reviewDefs.length,
    milestones: milestoneDefs.length,
    crewMembers: crewDefs.length,
    conversations: 4,
  })
}
