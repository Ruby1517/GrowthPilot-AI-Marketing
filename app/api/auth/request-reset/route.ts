import { dbConnect } from '@/lib/db'
import User from '@/models/User'
import crypto from 'crypto'
import { sendMail } from '@/lib/mail'

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email) return new Response('Email required', { status: 400 })

  await dbConnect()
  // Always respond the same to avoid account enumeration
  const genericOk = new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'content-type': 'application/json' }
  })

  const user = await User.findOne({ email })
  if (!user) return genericOk

  // Create token (store only a hash)
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  user.resetPasswordToken = tokenHash
  user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60) // 1h
  await user.save()

  const base = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const url = `${base}/auth/reset?token=${token}&email=${encodeURIComponent(email)}`

  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto">
      <h2>Reset your password</h2>
      <p>Click the button below to set a new password. This link expires in 1 hour.</p>
      <p><a href="${url}" style="display:inline-block;padding:10px 16px;background:#D4AF37;color:#000;text-decoration:none;border-radius:10px">Reset Password</a></p>
      <p>If the button doesn't work, copy and paste this URL:</p>
      <p><code>${url}</code></p>
    </div>
  `
  try { await sendMail(email, 'Reset your GrowthPilot password', html) } catch { /* ignore */ }
  return genericOk
}
