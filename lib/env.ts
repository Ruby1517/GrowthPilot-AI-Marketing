// Startup environment validation.
// Checks required vars using their common aliases (Vercel, NextAuth v4/v5).
// Warns about optional vars. In production, logs clearly and throws so the
// deploy fails fast rather than silently running broken.

type EnvCheck = {
  // One or more env keys that satisfy this requirement (first truthy wins)
  keys: string[]
  description: string
  required: boolean
}

// Vercel sets VERCEL_URL automatically on every deployment.
// NextAuth v5 uses AUTH_SECRET; v4 used NEXTAUTH_SECRET.
const CHECKS: EnvCheck[] = [
  {
    keys: ['AUTH_SECRET', 'NEXTAUTH_SECRET'],
    description: 'Session signing secret — set AUTH_SECRET in Vercel dashboard (Settings → Environment Variables)',
    required: true,
  },
  {
    keys: ['AUTH_URL', 'NEXTAUTH_URL', 'VERCEL_URL', 'NEXT_PUBLIC_APP_URL'],
    description: 'App canonical URL — Vercel sets VERCEL_URL automatically; or set NEXTAUTH_URL manually',
    required: true,
  },
  {
    keys: ['MONGODB_URI', 'DATABASE_URL'],
    description: 'MongoDB connection string',
    required: true,
  },
  {
    keys: ['OPENAI_API_KEY'],
    description: 'OpenAI key for content generation',
    required: true,
  },
  // Optional — warn only
  {
    keys: ['STRIPE_SECRET_KEY'],
    description: 'Stripe secret key — billing features disabled without this',
    required: false,
  },
  {
    keys: ['UPSTASH_REDIS_REST_URL'],
    description: 'Upstash Redis — rate limiting disabled without this',
    required: false,
  },
  {
    keys: ['SOCIAL_TOKEN_SECRET'],
    description: 'Social publishing token encryption secret — social publishing disabled without this',
    required: false,
  },
  {
    keys: ['SMTP_HOST'],
    description: 'SMTP host — email sending disabled without this',
    required: false,
  },
]

// Skip validation entirely during Next.js build phase.
// Env vars are only needed at runtime, not at build time.
const IS_BUILD =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.NEXT_PHASE === 'phase-export'

let validated = false

export function validateEnv(): void {
  if (validated || IS_BUILD) return
  validated = true

  const isProd = process.env.NODE_ENV === 'production'
  const missing: string[] = []
  const warnings: string[] = []

  for (const check of CHECKS) {
    const satisfied = check.keys.some(k => {
      const v = process.env[k]
      return v && v.trim() !== ''
    })

    if (!satisfied) {
      const keyList = check.keys.join(' or ')
      if (check.required) {
        missing.push(`  ✗ ${keyList} — ${check.description}`)
      } else {
        warnings.push(`  ⚠ ${keyList} — ${check.description}`)
      }
    }
  }

  if (warnings.length > 0) {
    console.warn(`[env] Optional env vars not set:\n${warnings.join('\n')}`)
  }

  if (missing.length > 0) {
    const msg = [
      '[env] REQUIRED environment variables are missing:',
      ...missing,
      '',
      isProd
        ? 'Add these in your Vercel dashboard → Project → Settings → Environment Variables, then redeploy.'
        : 'Copy .env.example → .env.local and fill in the values.',
    ].join('\n')

    if (isProd) {
      // Log before throwing so it appears in Vercel function logs
      console.error(msg)
      throw new Error(msg)
    } else {
      console.error(msg)
    }
  }
}

// validateEnv() is called explicitly from lib/db.ts on first database connection.
// Do NOT auto-run here — this module is imported at build time and would crash
// static page generation on Vercel where runtime env vars are not yet available.
