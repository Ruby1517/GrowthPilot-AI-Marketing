import { NextResponse } from 'next/server'

export function GET() {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const body = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`
  return new NextResponse(body, { headers: { 'content-type': 'text/plain' } })
}

