# API Contracts

All responses: `{ ok: true, data }` or `{ ok: false, error: { code, message } }`. Validate input with Zod. All routes except webhooks require an authenticated Supabase session.

## POST /api/jobs
Create a Mode B job.
- Body: `{ inputPath: string }` (must start with `{userId}/`)
- Steps: auth → rate limit (e.g. 5/min/user, 20/min/IP) → daily cap check → `start_job` RPC → submit to GPU adapter → store `provider_job_id`, set `running`.
- 200: `{ jobId, status: 'queued' | 'running' }`
- 402 `INSUFFICIENT_CREDITS`, 429 `RATE_LIMITED`, 503 `DAILY_CAP_REACHED`, 400 `INVALID_INPUT`
- If provider submit fails: call `refund_job`, return 502.

## GET /api/jobs
List the user's jobs (paginated): `?limit=20&cursor=`.

## GET /api/jobs/[id]
- Returns `{ id, status, error?, outputUrl? }` where `outputUrl` is a signed URL (10 min) once `done`.
- 404 if not the user's job.

## DELETE /api/jobs/[id]
Delete the job row and its files.

## POST /api/gpu/webhook
Called by the GPU provider. Verify the shared secret/signature first (reject otherwise).
- done → download output, store in `outputs`, set `done`, `completed_at`.
- failed → `refund_job`.
- Idempotent: ignore if job already `done` or `failed`.

## POST /api/stripe/checkout
- Body: `{ product: 'pro_monthly' | 'credit_pack' }`
- Creates Checkout Session with `client_reference_id = userId`, `metadata.userId`, success URL `/billing?checkout=success` (display only, **grants nothing**), cancel URL `/billing`.
- Returns `{ url }`.

## POST /api/stripe/webhook
Source of truth for billing. Read the **raw body**, verify with `STRIPE_WEBHOOK_SECRET`.
| Event | Action |
|---|---|
| `checkout.session.completed` | Save `stripe_customer_id`; if credit pack, `grant_credits(..., 'purchase', event.id)` |
| `invoice.paid` | Set plan `pro`; `grant_credits(..., 'subscription_grant', event.id)` |
| `customer.subscription.deleted` | Set plan `free` |
Return 200 quickly. Unknown events: 200 and ignore.

## POST /api/stripe/portal
Create a Stripe billing portal session for the user's `stripe_customer_id`.

## Error codes
`UNAUTHENTICATED`, `INVALID_INPUT`, `INSUFFICIENT_CREDITS`, `RATE_LIMITED`, `DAILY_CAP_REACHED`, `NOT_FOUND`, `PROVIDER_ERROR`, `INTERNAL`.
