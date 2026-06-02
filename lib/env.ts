// Startup environment validation.
// Import this at the top of any server entry point (e.g. layout.tsx server component, workers).
// Logs clear warnings in development; throws in production so the deploy fails fast
// rather than silently running in a broken state.

type EnvVar = {
  key: string
  description: string
  required: boolean
}

const VARS: EnvVar[] = [
  // Auth
  { key: 'NEXTAUTH_SECRET',      description: 'Session signing key — required for secure auth',        required: true  },
  { key: 'NEXTAUTH_URL',         description: 'Canonical app URL for OAuth callbacks',                  required: true  },
  // Database
  { key: 'MONGODB_URI',          description: 'MongoDB connection string',                              required: true  },
  // AI
  { key: 'OPENAI_API_KEY',       description: 'OpenAI key for content generation',                     required: true  },
  // Billing
  { key: 'STRIPE_SECRET_KEY',    description: 'Stripe secret key for billing',                         required: false },
  { key: 'STRIPE_WEBHOOK_SECRET',description: 'Stripe webhook signature verification',                 required: false },
  // Rate limiting
  { key: 'UPSTASH_REDIS_REST_URL',  description: 'Upstash Redis URL for rate limiting',               required: false },
  { key: 'UPSTASH_REDIS_REST_TOKEN',description: 'Upstash Redis token',                               required: false },
  // Email
  { key: 'SMTP_HOST',            description: 'SMTP host for sending emails',                          required: false },
  { key: 'FROM_EMAIL',           description: 'Sender address for transactional emails',               required: false },
  // Social publishing
  { key: 'SOCIAL_TOKEN_SECRET',  description: '32+ char secret for encrypting social OAuth tokens',    required: false },
  // Workers (required if using background jobs)
  { key: 'REDIS_URL',            description: 'Redis URL for BullMQ workers',                         required: false },
]

let validated = false

export function validateEnv(): void {
  if (validated) return
  validated = true

  const isProd = process.env.NODE_ENV === 'production'
  const missing: string[] = []
  const warnings: string[] = []

  for (const v of VARS) {
    const value = process.env[v.key]
    if (!value || value.trim() === '') {
      if (v.required) {
        missing.push(`  ✗ ${v.key} — ${v.description}`)
      } else {
        warnings.push(`  ⚠ ${v.key} — ${v.description} (some features disabled)`)
      }
    }
  }

  if (warnings.length > 0) {
    console.warn(`[env] Optional env vars not set:\n${warnings.join('\n')}`)
  }

  if (missing.length > 0) {
    const msg = `[env] REQUIRED env vars missing:\n${missing.join('\n')}\n\nCopy .env.example → .env.local and fill in the values.`
    if (isProd) {
      throw new Error(msg)
    } else {
      console.error(msg)
    }
  }
}

// Auto-validate on import in server context
if (typeof window === 'undefined') {
  validateEnv()
}
