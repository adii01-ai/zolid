# Architecture

## Overview
```
Browser (Next.js + R3F)
  ├─ Mode A: Transformers.js depth model → mesh → viewer → GLB export (all local)
  └─ Mode B: upload → API
                 │
         Next.js API routes ──► Supabase (Auth, Postgres, Storage)
                 │                     ▲
                 │ create job          │ result + status
                 ▼                     │
        GPU provider (serverless) ─────┘ (webhook on completion)

Stripe Checkout ──webhook──► /api/stripe/webhook ──► credits/plan in Postgres
```

## Folder structure
```
src/
  app/
    (marketing)/page.tsx            landing + Mode A demo
    (app)/studio/page.tsx           upload + viewer (Mode A and B)
    (app)/gallery/page.tsx          past models
    (app)/billing/page.tsx          plan, credits, buy
    auth/                           login, signup, callback
    api/
      jobs/route.ts                 POST create job, GET list
      jobs/[id]/route.ts            GET status, DELETE
      gpu/webhook/route.ts          GPU provider completion callback
      stripe/checkout/route.ts      POST create Checkout session
      stripe/webhook/route.ts       Stripe events (source of truth)
      stripe/portal/route.ts        billing portal
  components/
    viewer/ModelViewer.tsx
    upload/Dropzone.tsx
    depth/DepthMeshBuilder.ts
  lib/
    supabase/{client,server,admin}.ts
    server/{credits,jobs,stripe,rateLimit}.ts
    gpu/{adapter.ts,replicate.ts}   provider adapter interface
    export/{glb,obj,stl}.ts
    validation/schemas.ts
  types/
supabase/migrations/                SQL from docs/DATABASE.md
tests/
```

## Mode A (free, local)
1. Validate file (type, size ≤ 10 MB, ≥ 256 px).
2. Run depth model in a Web Worker (default: a small Depth Anything model via Transformers.js). Show download progress for the model on first use.
3. Downscale image (max 1024 px), build a displaced plane mesh from the depth map, texture it with the photo.
4. Render in R3F; export with `GLTFExporter`.
5. Nothing is sent to the server.

## Mode B (paid, GPU)
1. Client uploads image to Supabase Storage (`inputs/{user_id}/{uuid}`).
2. Client calls `POST /api/jobs`. Server: auth → rate limit → daily cap check → call SQL `start_job` (atomic credit spend + job row).
3. Server optionally runs background removal, then submits to the GPU provider through the adapter, saving `provider_job_id`.
4. Provider calls `/api/gpu/webhook` (verify secret). Server downloads the GLB, stores it in `outputs/{user_id}/{job_id}.glb`, sets status `done`. On failure: set `failed` and call `refund_job`.
5. Client polls `GET /api/jobs/:id` every 3 s (or uses Supabase Realtime) and shows the viewer when `done`.
6. OBJ/STL are converted on demand from the GLB.
7. A cron/scheduled function marks jobs stuck in `running` > 10 min as `failed` and refunds them.

## Provider adapter (keep the GPU vendor swappable)
```ts
export interface GpuProvider {
  submit(input: { imageUrl: string; jobId: string; webhookUrl: string }): Promise<{ providerJobId: string }>;
  verifyWebhook(req: Request): Promise<{ jobId: string; status: 'done' | 'failed'; outputUrl?: string; error?: string }>;
}
```
Model choice is an open decision. Verify the model's commercial license before launch.

## Billing
- Products: Pro (monthly, includes N credits/month) and Credit Pack (one-time).
- Checkout created server-side with `client_reference_id = user_id`.
- Webhook events handled: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`.
- Each event writes a `credit_ledger` row keyed by `stripe_event_id` (unique) so replays do nothing.

## Storage
- Buckets `inputs` and `outputs`, private. Serve via short-lived signed URLs.
- Inputs deleted after 30 days unless tied to a saved model. Run a scheduled cleanup.
