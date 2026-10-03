# Security and Abuse Checklist

## Authentication and data
- [ ] RLS enabled on every table; tested with two different users
- [ ] Service-role key used only in server code, never imported by client components
- [ ] Storage paths scoped to `auth.uid()`; files served via signed URLs
- [ ] No credit or plan writes from the client

## Payments
- [ ] Webhook verifies Stripe signature using the raw request body
- [ ] Webhook is idempotent (`stripe_event_id` unique)
- [ ] `?success=true` redirect grants nothing
- [ ] Test mode keys in dev; live keys only in production env

## Abuse and cost control
- [ ] GPU jobs require login and credits
- [ ] Rate limit per user and per IP on `/api/jobs`
- [ ] File type (magic bytes, not just extension), size ≤ 10 MB, dimension limits
- [ ] Daily GPU job cap (`DAILY_GPU_JOB_CAP`) and spending cap at the provider
- [ ] Stuck-job cleanup + automatic refund
- [ ] Disposable-email/multi-account signup abuse: consider email verification before free credits

## Web hardening
- [ ] Security headers (CSP, X-Content-Type-Options, Referrer-Policy)
- [ ] CORS closed except same origin; webhooks verified by secret
- [ ] Errors do not leak stack traces or secrets
- [ ] Dependencies audited (`npm audit`), Dependabot enabled

## Compliance
- [ ] Terms of Service, Privacy Policy, content policy, takedown contact
- [ ] Model license reviewed for commercial use
- [ ] Data retention: inputs deleted after 30 days unless saved; account deletion removes all data
