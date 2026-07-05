import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const jobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  trade: z.string().min(1, 'Trade is required').max(100),
  category: z.string().optional().default('General'),
  budgetMin: z.coerce.number().min(0, 'Minimum budget must be at least 0'),
  budgetMax: z.coerce.number().min(0, 'Maximum budget must be at least 0'),
  location: z.string().min(1, 'Location is required').max(200),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  duration: z.string().optional().default('Flexible'),
  crewSize: z.coerce.number().int().min(1).optional().default(1),
  urgency: z.string().optional().default('STANDARD'),
}).refine(data => data.budgetMax >= data.budgetMin, {
  message: "Maximum budget cannot be less than minimum budget",
  path: ["budgetMax"],
});

export const bidSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive').max(10_000_000, 'Amount is too large'),
  message: z.string().min(1, 'Message is required').max(1000),
  duration: z.string().max(200).optional().default('Flexible'),
});

export const reviewSchema = z.object({
  targetId: z.string().min(1),
  rating: z.number().int().min(1, 'Rating must be 1-5').max(5, 'Rating must be 1-5'),
  comment: z.string().min(1, 'Comment is required').max(1000),
  jobId: z.string().optional().nullable(),
});

export const messageSchema = z.object({
  body: z.string().min(1, 'Message is required').max(5000),
});

export const conversationCreateSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
  jobId: z.string().optional().nullable(),
  body: z.string().min(1, 'Message is required').max(5000),
});

export const favoriteSchema = z.object({
  jobId: z.string().optional().nullable(),
  targetUserId: z.string().optional().nullable(),
}).refine(data => data.jobId || data.targetUserId, {
  message: 'Must specify jobId or targetUserId',
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  name: z.string().min(1, 'Name is required').max(200, 'Name is too long'),
  role: z.enum(['CONTRACTOR', 'SUBCONTRACTOR'], {
    message: 'Invalid role'
  }),
  company: z.string().max(200).optional().nullable(),
  trade: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
});
