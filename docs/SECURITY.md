# Security Hardening 

Baseline practices applied:

- Security headers via Next.js (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, basic CSP).
- Optional per-org rate limiting on ViralPilot endpoints (Upstash). Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to enable.
- External calls (ElevenLabs) wrapped with retry + backoff.

Recommended next steps:

- Rotate API keys and vault them (1Password, Doppler, Vault, or cloud secrets manager). Avoid committing `.env` to VCS.
- Add audit logs for role changes and billing events.
- Run dependency checks (npm audit, Snyk) during CI.

