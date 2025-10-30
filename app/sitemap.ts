import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const routes = [
    '/',
    '/dashboard',
    '/pricing',
    '/billing',
    '/postpilot',
    '/clips',
    '/blogpilot',
    '/adpilot',
    '/leadpilot',
    '/mailpilot',
    '/brandpilot',
    '/viralpilot',
  ]
  const now = new Date()
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.6,
  }))
}

