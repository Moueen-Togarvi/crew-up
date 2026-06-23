# Complete Authentication & UI Improvements Plan

## Overview
Add complete authentication system with email verification, Gmail OAuth login, password reset, and fix UI issues in CrewUp marketplace.

## Phase 1: Database Schema Updates

### Files to Modify:
- `prisma/schema.prisma`

### Changes:
1. Add email verification fields to User model:
   ```prisma
   emailVerified     DateTime?  @db.Date
   verificationToken String?   @unique
   resetToken        String?   @unique
   resetExpires      DateTime?
   twoFactorSecret   String?
   twoFactorEnabled  Boolean  @default(false)
   ```

2. Update User model relations if needed

3. Run migration:
   ```bash
   npx prisma migrate dev --name add_email_verification_and_reset
   npx prisma generate
   ```

---

## Phase 2: Email Service Setup

### Files to Create:
- `src/lib/email.ts` - Email sending utility using Nodemailer
- `.env` - Add email service variables

### Changes:
1. Install dependencies:
   ```bash
   npm install nodemailer
   ```

2. Create email service with:
   - Email template for verification
   - Email template for password reset
   - Template for welcome email
   - Send verification email function
   - Send reset email function

3. Environment variables (`.env`):
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_FROM=CrewUp <noreply@crewup.com>
   ```

---

## Phase 3: Email Verification System

### Files to Create:
- `src/app/api/auth/verify-email/route.ts` - Verify email endpoint
- `src/app/api/auth/resend-verification/route.ts` - Resend verification
- `src/components/crewup/auth/verify-email-dialog.tsx` - Email verification UI
- `src/components/crewup/auth/resend-verification.tsx` - Resend verification UI

### Changes to Existing Files:
- `src/app/api/auth/signup/route.ts` - Send verification email after signup
- `src/components/crewup/auth/auth-modal.tsx` - Add verification status and resend button

### Implementation:
1. **Signup API** - After creating user:
   - Generate verification token (UUID)
   - Send verification email
   - Don't auto-login until verified

2. **Verify Email API**:
   - Accept token as query param
   - Find user by token
   - Update `emailVerified` to now()
   - Delete token
   - Return success

3. **Resend Verification API**:
   - Check if email already verified
   - Generate new token
   - Send new email
   - Rate limit (1 per hour)

4. **UI Components**:
   - Show verification status after signup
   - Provide "Resend verification email" button
   - Show success message when verified

---

## Phase 4: Password Reset System

### Files to Create:
- `src/app/api/auth/forgot-password/route.ts` - Request password reset
- `src/app/api/auth/reset-password/route.ts` - Execute password reset
- `src/components/crewup/auth/forgot-password-dialog.tsx` - Forgot password UI
- `src/components/crewup/auth/reset-password-dialog.tsx` - Reset password UI

### Changes to Existing Files:
- `src/app/api/auth/login/route.ts` - Add "forgot password" link

### Implementation:
1. **Forgot Password API**:
   - Validate email
   - Check if user exists
   - Generate reset token (UUID)
   - Set resetExpires (15 minutes)
   - Send reset email
   - Rate limit (5 per hour)

2. **Reset Password API**:
   - Accept token and new password
   - Find user by token
   - Check if token not expired
   - Hash and update password
   - Delete token
   - Return success

3. **UI Components**:
   - Add "Forgot password?" link to login form
   - Show email input dialog
   - Show reset form with token from email
   - Show success message

---

## Phase 5: Gmail OAuth Integration

### Files to Create:
- `src/app/api/auth/oauth/google/route.ts` - Google OAuth callback
- `src/lib/auth/oauth.ts` - OAuth utility functions
- `src/components/crewup/auth/google-login-button.tsx` - Google login button

### Changes to Existing Files:
- `src/components/crewup/auth/auth-modal.tsx` - Add Google OAuth button
- `src/lib/auth.ts` - Add OAuth session functions

### Implementation:
1. **Setup Google Cloud Console**:
   - Create OAuth 2.0 credentials
   - Get client ID and secret
   - Add authorized redirect URI: `http://localhost:3000/api/auth/oauth/google/callback`

2. **Install Dependencies**:
   ```bash
   npm install next-auth @auth/core
   ```

3. **OAuth Flow**:
   - Redirect to Google OAuth consent screen
   - Google redirects to callback route
   - Exchange code for tokens
   - Check if user exists by email
   - If new user: auto-create with role selection
   - If existing: auto-login
   - Set session cookie

4. **UI Component**:
   - Add Google OAuth button to signup form
   - Show loading state during OAuth
   - Handle errors gracefully

---

## Phase 6: Rate Limiting Enhancement

### Files to Create:
- `src/lib/rate-limit.ts` - Enhanced rate limiter (already exists, needs enhancement)

### Changes to Existing Files:
- Apply rate limiting to all API routes

### Implementation:
1. Update `src/lib/rate-limit.ts`:
   - Add in-memory rate limiting
   - Support multiple keys (IP + user ID)
   - Return proper headers

2. Add rate limiting to all API routes:
   - `/api/auth/*` - 10 attempts/minute
   - `/api/jobs/*` - 30 attempts/minute
   - `/api/bids/*` - 30 attempts/minute
   - `/api/users/*` - 20 attempts/minute
   - Other routes - 60 attempts/minute

---

## Phase 7: UI Fixes & Improvements

### Files to Check & Fix:
- `src/components/crewup/auth/auth-modal.tsx` - Add verification UI
- `src/components/crewup/landing/navbar.tsx` - Add disclaimer about email verification
- `src/components/crewup/landing/landing-page.tsx` - Add verification notice
- `src/app/page.tsx` - Check auth flow

### Specific Fixes:
1. **Auth Modal**:
   - Add email verification status indicator
   - Add "Resend verification email" button for unverified users
   - Show success message after signup
   - Add "Forgot password?" link to login form

2. **Landing Page**:
   - Add small disclaimer about email verification
   - "Please verify your email to complete signup"

3. **Error Handling**:
   - Add better error messages throughout auth flow
   - Show specific error types (invalid token, expired, etc.)
   - Add loading states for all async operations

4. **Accessibility**:
   - Add ARIA labels to all new components
   - Ensure keyboard navigation works
   - Add focus management

---

## Phase 8: Security Enhancements

### Files to Modify:
- `src/lib/auth.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/signup/route.ts`

### Changes:
1. **Password Requirements**:
   - Minimum 8 characters
   - At least 1 uppercase
   - At least 1 lowercase
   - At least 1 number
   - At least 1 special character

2. **Session Security**:
   - Set `SameSite=strict` for cookies
   - Add CSRF protection for OAuth
   - Implement secure token rotation

3. **Email Validation**:
   - Add domain validation
   - Check for disposable email domains
   - Verify email format more strictly

---

## Phase 9: Testing

### Test Cases:
1. **Email Verification**:
   - Sign up without verification
   - Verify email with valid token
   - Verify with expired token
   - Resend verification email
   - Rate limit resend attempts

2. **Password Reset**:
   - Request password reset
   - Reset with valid token
   - Reset with expired token
   - Reset with invalid token
   - Rate limit reset requests

3. **OAuth**:
   - Login with Google (new user)
   - Login with Google (existing user)
   - OAuth error handling
   - Role selection for new OAuth users

4. **Security**:
   - Rate limiting on all endpoints
   - Password strength validation
   - Email format validation

---

## Phase 10: Documentation

### Files to Update:
- `README.md` - Add authentication instructions
- `.env.example` - Add email and OAuth variables
- `docs/auth.md` - Authentication flow documentation

### Content:
- How to set up email service
- How to configure Google OAuth
- Environment variables reference
- Authentication flow diagrams
- Troubleshooting guide

---

## File Summary

### New Files (13):
1. `src/lib/email.ts`
2. `src/app/api/auth/verify-email/route.ts`
3. `src/app/api/auth/resend-verification/route.ts`
4. `src/app/api/auth/forgot-password/route.ts`
5. `src/app/api/auth/reset-password/route.ts`
6. `src/app/api/auth/oauth/google/route.ts`
7. `src/lib/auth/oauth.ts`
8. `src/components/crewup/auth/verify-email-dialog.tsx`
9. `src/components/crewup/auth/resend-verification.tsx`
10. `src/components/crewup/auth/forgot-password-dialog.tsx`
11. `src/components/crewup/auth/reset-password-dialog.tsx`
12. `src/components/crewup/auth/google-login-button.tsx`
13. `docs/auth.md`

### Modified Files (7):
1. `prisma/schema.prisma` - Add email verification fields
2. `src/app/api/auth/signup/route.ts` - Send verification email
3. `src/app/api/auth/login/route.ts` - Add forgot password link
4. `src/components/crewup/auth/auth-modal.tsx` - Add verification UI
5. `src/components/crewup/landing/navbar.tsx` - Add disclaimer
6. `src/components/crewup/landing/landing-page.tsx` - Add notice
7. `.env.example` - Add email and OAuth variables

---

## Verification Steps

After implementation, verify:
1. ✅ User can sign up and receive verification email
2. ✅ User can verify email with valid token
3. ✅ Unverified users cannot access protected routes
4. ✅ User can request password reset
5. ✅ User can reset password with valid token
6. ✅ User can login with Gmail OAuth
7. ✅ Rate limiting works on all endpoints
8. ✅ Password strength requirements enforced
9. ✅ Error messages are clear and helpful
10. ✅ UI components are accessible
11. ✅ Demo accounts still work (they don't need verification)
12. ✅ Session management still works correctly

---

## Dependencies to Install

```bash
npm install nodemailer
npm install next-auth @auth/core
npm install zod
```

---

## Estimated Implementation Time

- Phase 1: Database Schema - 30 minutes
- Phase 2: Email Service - 1 hour
- Phase 3: Email Verification - 2 hours
- Phase 4: Password Reset - 2 hours
- Phase 5: Gmail OAuth - 3 hours
- Phase 6: Rate Limiting - 1 hour
- Phase 7: UI Fixes - 2 hours
- Phase 8: Security - 1 hour
- Phase 9: Testing - 2 hours
- Phase 10: Documentation - 1 hour

**Total: ~16 hours**