import nodemailer from 'nodemailer'

const from = process.env.EMAIL_FROM || 'no-reply@growthpilot.local'

export async function sendMail(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false, // true if port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  return transporter.sendMail({ from, to, subject, html })
}
