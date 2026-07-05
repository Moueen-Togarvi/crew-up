import nodemailer from 'nodemailer'
import { randomBytes } from 'crypto'

const EMAIL_FROM = process.env.EMAIL_FROM || 'BuildUp <noreply@buildup.com>'

export interface EmailOptions {
  to: string
  subject: string
  html: string
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    })
  } catch (error) {
    console.error('Email sending failed:', error)
    throw new Error('Failed to send email')
  }
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex')
}

export function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}

export function generateVerificationUrl(base: string, token: string): string {
  return `${base}/api/auth/verify-email?token=${token}`
}

export function getResetUrl(base: string, token: string): string {
  return `${base}/api/auth/reset-password?token=${token}`
}

/** HTML-escape user-supplied strings to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function formatVerificationEmail(name: string, url: string): string {
  const safeName = escapeHtml(name)
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email - BuildUp</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
    }
    .header p {
      color: #bfdbfe;
      margin: 10px 0 0 0;
      font-size: 16px;
    }
    .content {
      padding: 30px;
    }
    .content h2 {
      color: #1e293b;
      font-size: 24px;
      margin-top: 0;
    }
    .content p {
      color: #64748b;
      line-height: 1.6;
      font-size: 16px;
    }
    .button {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      font-size: 16px;
    }
    .button:hover {
      background: #2563eb;
    }
    .footer {
      background: #f1f5f9;
      padding: 20px;
      text-align: center;
      color: #64748b;
      font-size: 14px;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚧 Verify your email</h1>
      <p>Welcome to BuildUp!</p>
    </div>
    <div class="content">
      <h2>Thanks for signing up, ${safeName}!</h2>
      <p>Please verify your email address to complete your signup. This helps us keep your account secure.</p>
      <p><strong>Click the button below to verify your email:</strong></p>
      <a href="${url}" class="button">Verify my email</a>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account on BuildUp, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>This was sent from BuildUp</p>
      <p>© ${new Date().getFullYear()} BuildUp. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function formatResetEmail(name: string, url: string): string {
  const safeName = escapeHtml(name)
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password - BuildUp</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
    }
    .header p {
      color: #fef3c7;
      margin: 10px 0 0 0;
      font-size: 16px;
    }
    .content {
      padding: 30px;
    }
    .content h2 {
      color: #1e293b;
      font-size: 24px;
      margin-top: 0;
    }
    .content p {
      color: #64748b;
      line-height: 1.6;
      font-size: 16px;
    }
    .button {
      display: inline-block;
      background: #f59e0b;
      color: white;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      font-size: 16px;
    }
    .button:hover {
      background: #d97706;
    }
    .footer {
      background: #f1f5f9;
      padding: 20px;
      text-align: center;
      color: #64748b;
      font-size: 14px;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔑 Reset your password</h1>
      <p>Need a new password?</p>
    </div>
    <div class="content">
      <h2>Hi ${safeName},</h2>
      <p>We received a request to reset your password for your BuildUp account.</p>
      <p><strong>Click the button below to reset your password:</strong></p>
      <a href="${url}" class="button">Reset my password</a>
      <p>This link will expire in 15 minutes.</p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <p>To keep your account secure, please don't share this link with anyone.</p>
    </div>
    <div class="footer">
      <p>This was sent from BuildUp</p>
      <p>© ${new Date().getFullYear()} BuildUp. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function formatWelcomeEmail(name: string, role: string): string {
  const safeName = escapeHtml(name)
  const roleText = role === 'CONTRACTOR' ? 'hire crews' : 'find work'
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to BuildUp - Construction Marketplace</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
    }
    .header p {
      color: #d1fae5;
      margin: 10px 0 0 0;
      font-size: 16px;
    }
    .content {
      padding: 30px;
    }
    .content h2 {
      color: #1e293b;
      font-size: 24px;
      margin-top: 0;
    }
    .content p {
      color: #64748b;
      line-height: 1.6;
      font-size: 16px;
    }
    .feature {
      margin: 20px 0;
      padding: 15px;
      background: #f1f5f9;
      border-radius: 6px;
    }
    .feature h3 {
      color: #1e293b;
      margin-top: 0;
      font-size: 18px;
    }
    .footer {
      background: #f1f5f9;
      padding: 20px;
      text-align: center;
      color: #64748b;
      font-size: 14px;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to BuildUp!</h1>
      <p>Your construction marketplace is ready</p>
    </div>
    <div class="content">
      <h2>Hi ${safeName}!</h2>
      <p>Great to have you on BuildUp! We're excited to help you ${roleText}.</p>

      <div class="feature">
        <h3>🏗️ What you can do</h3>
        <ul style="color: #64748b; line-height: 1.8; font-size: 15px;">
          <li><strong>Post jobs</strong> if you're a contractor looking to hire crews</li>
          <li><strong>Bid on jobs</strong> if you're a subcontractor looking for work</li>
          <li><strong>Connect with others</strong> in the construction industry</li>
          <li><strong>Build your reputation</strong> with reviews and ratings</li>
        </ul>
      </div>

      <p><strong>Next steps:</strong></p>
      <ol style="color: #64748b; line-height: 1.8; font-size: 15px;">
        <li>Complete your profile</li>
        <li>Upload a profile picture</li>
        <li>Start exploring jobs or posting your own</li>
      </ol>

      <p><strong>Need help?</strong> Check out our <a href="#" style="color: #3b82f6;">Getting Started Guide</a></p>
    </div>
    <div class="footer">
      <p>This was sent from BuildUp</p>
      <p>© ${new Date().getFullYear()} BuildUp. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}