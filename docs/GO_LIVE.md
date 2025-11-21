# Go-Live Guide

This guide summarizes what to set before launching GrowthPilot to production and taking payments.

## 1) Secrets and Environment

Set all required env vars in your deployment platform. See `.env.example` for the full list. Minimum:

- Auth: `NEXTAUTH_URL`, `AUTH_SECRET`
- Database: `MONGODB_URI`, `MONGODB_DB`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Storage: `AWS_REGION`, `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (optional: `CDN_URL`)
- Redis (queues): `REDIS_URL`
- Rate limiting (recommended): `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- AI: `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`
- Email: `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- ESP integrations: `KLAVIYO_API_KEY` (and optional `KLAVIYO_API_REVISION`)

Rotate any previously exposed secrets (e.g., database credentials) before launch.

## 2) Billing Setup

- In Stripe, create active prices for Starter/Pro/Business. Either set:
  - `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`, or
  - Use `lookup_key` values `starter_monthly`, `pro_monthly`, `business_monthly`.
- Set metered prices for usage (tokens/minutes) or leave blank for auto-detection.
- Deploy webhook with `STRIPE_WEBHOOK_SECRET` and confirm event delivery.
- Test end-to-end: checkout, portal access, webhook updates org plan, invoice overage marking.

## 3) Security and Limits

- CSP: consider removing `'unsafe-inline'` in production by adopting nonces/hashes.
- Server Actions: next.config restricts `allowedOrigins` to `NEXT_PUBLIC_APP_URL` host in production.
- Rate limiting: with Upstash envs set, 20 req/min per org is enforced (no-op fallback otherwise).
- Ensure ffmpeg/ffprobe available (visit `/api/diagnostics/ffmpeg`).

## 4) Monitoring and Backups

- Add error tracking (e.g., Sentry) for server/client.
- Enable MongoDB automated backups.
- Monitor Stripe webhooks (retry dashboards) and queue health.

## 5) Operational Checks

- Queues: workers for `bullmq` run with `REDIS_URL`.
- Storage: uploads work (multipart and signed PUT), CDN URL configured if applicable.
- Access controls: verify plan gating per module and usage consumption/overage flows.

## 6) CI/CD

- GitHub Actions workflow runs lint and typecheck on PRs.
- Add additional steps (e2e tests, build) once non-prod env vars are available for CI.

## 7) Launch

- Announce via email + social, link to pricing, collect feedback.
- Watch logs and metrics during the first 24–48 hours.
