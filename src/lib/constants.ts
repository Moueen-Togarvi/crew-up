// CrewUp shared constants & types

export const TRADES = [
  "Electrical",
  "Plumbing",
  "Framing",
  "Roofing",
  "Concrete",
  "HVAC",
  "Drywall",
  "Painting",
  "Flooring",
  "Masonry",
  "Excavation",
  "Welding",
  "Carpentry",
  "Landscaping",
  "Demolition",
  "General Labor",
] as const

export const CATEGORIES = [
  "General",
  "Commercial",
  "Residential",
  "Industrial",
] as const

export const URGENCY = [
  { value: "URGENT", label: "Urgent", color: "bg-red-500" },
  { value: "STANDARD", label: "Standard", color: "bg-amber-500" },
  { value: "FLEXIBLE", label: "Flexible", color: "bg-emerald-500" },
] as const

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
] as const

export const PLANS = [
  {
    id: "FREE",
    name: "Starter",
    price: 0,
    period: "forever",
    tagline: "For getting started",
    features: [
      "Browse the marketplace",
      "Post up to 3 jobs / month",
      "Submit up to 5 bids / month",
      "Basic messaging",
      "Community support",
    ],
    cta: "Start Free",
    highlight: false,
  },
  {
    id: "PRO",
    name: "Pro",
    price: 49,
    period: "month",
    tagline: "For active professionals",
    features: [
      "Unlimited job posts & bids",
      "Priority placement in marketplace",
      "Verified profile badge",
      "Advanced crew management",
      "Unlimited messaging",
      "Analytics dashboard",
      "Email + chat support",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: 199,
    period: "month",
    tagline: "For growing operations",
    features: [
      "Everything in Pro",
      "Multiple team seats",
      "Dedicated account manager",
      "Custom integrations & API",
      "Priority support SLA",
      "Invoicing & NET-30 terms",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
] as const

export type Role = "CONTRACTOR" | "SUBCONTRACTOR"
export type JobStatus = "OPEN" | "ASSIGNED" | "COMPLETED" | "CANCELLED"
export type BidStatus = "PENDING" | "ACCEPTED" | "REJECTED"

export interface PublicUser {
  id: string
  email: string
  name: string
  role: Role
  company?: string | null
  phone?: string | null
  city?: string | null
  state?: string | null
  avatarUrl?: string | null
  bio?: string | null
  trade?: string | null
  skills?: string | null
  hourlyRate?: number | null
  rating: number
  reviewCount: number
  jobsCompleted: number
  verified: boolean
  plan: string
  createdAt: string
}

export interface JobWithRelations {
  id: string
  title: string
  description: string
  trade: string
  category: string
  budgetMin: number
  budgetMax: number
  location: string
  city?: string | null
  state?: string | null
  duration: string
  crewSize: number
  urgency: string
  status: string
  contractorId: string
  assignedToId?: string | null
  createdAt: string
  updatedAt: string
  contractor: PublicUser
  bids: BidWithUser[]
  _count?: { bids: number }
}

export interface BidWithUser {
  id: string
  amount: number
  message: string
  duration: string
  status: string
  jobId: string
  subcontractorId: string
  createdAt: string
  subcontractor: PublicUser
}
