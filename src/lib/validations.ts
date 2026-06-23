import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const jobSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  trade: z.string().min(1, 'Trade is required'),
  category: z.string().optional().default('General'),
  budgetMin: z.coerce.number().min(0, 'Minimum budget must be at least 0'),
  budgetMax: z.coerce.number().min(0, 'Maximum budget must be at least 0'),
  location: z.string().min(1, 'Location is required'),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  duration: z.string().optional().default('Flexible'),
  crewSize: z.coerce.number().int().min(1).optional().default(1),
  urgency: z.string().optional().default('STANDARD'),
}).refine(data => data.budgetMax >= data.budgetMin, {
  message: "Maximum budget cannot be less than minimum budget",
  path: ["budgetMax"],
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['CONTRACTOR', 'SUBCONTRACTOR'], {
    message: 'Invalid role'
  }),
  company: z.string().optional().nullable(),
  trade: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});
