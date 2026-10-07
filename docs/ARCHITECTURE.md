# Architecture

## Overview

```
Browser (Next.js + R3F)
  └─ existing Generate action → authenticated depth API → depth map
                                      │                 │
                               atomic reservation    relief mesh → viewer/GLB

Browser (Studio video panel)
  └─ POST /api/generate-video → authenticated provider-neutral service
                                      │
                                 provider adapter (not configured)

Next.js API routes ──► Supabase Auth + Postgres
                              │
                     atomic reserve/complete/cancel

Paid plans are shown as pending until payment checkout is implemented.
```

## Folder structure

```
src/
  app/
    (marketing)/page.tsx            landing + Mode A demo
    (app)/studio/page.tsx           upload + depth relief viewer + video panel
    (app)/gallery/page.tsx          past models
    (app)/billing/page.tsx          plan, credits, buy
    auth/                           login, signup, callback
    api/
      depth/generate/route.ts       authenticated depth inference + quota reservation
      depth/complete/route.ts       atomic successful-generation debit
      depth/cancel/route.ts         release reservation after failure
      generate-video/route.ts       authenticated provider-neutral video API
  components/
    viewer/ModelViewer.tsx
    upload/Dropzone.tsx
  lib/
    supabase/{client,server,admin}.ts
    video/service.ts                provider adapter boundary (provider pending)
    server/{credits,jobs,stripe,rateLimit}.ts
    gpu/{adapter.ts,replicate.ts}   provider adapter interface
    export/{glb,obj,stl}.ts
    validation/schemas.ts
  types/
supabase/migrations/                SQL from docs/DATABASE.md
tests/
```

## Studio depth-relief flow

1. The existing uploader validates the image. The existing Generate action calls `/api/depth/generate`.
2. The server authenticates the session, validates and decodes the image, then calls `reserve_depth_generation()`.
3. Postgres serializes reservations against the profile. Purchased credits are reserved first; otherwise a free slot is reserved. Concurrent requests cannot reserve beyond either balance.
4. The server runs Depth Anything and returns a normalized depth map. Inference failure calls `cancel_depth_generation()` and does not debit the account.
5. The Three.js viewer builds the front-facing relief. On viewer readiness, `/api/depth/complete` calls the atomic completion RPC, which consumes the reserved purchased credit or increments `free_generations_used`.
6. Stale reservations expire after 30 minutes. The browser never decides the authoritative allowance.

## Billing

- `profiles.credits` remains the purchased credit balance; Stripe checkout is not implemented and no paid credits are issued yet.
- Future plan credit amounts and prices must come from configured payment-product metadata, not client input or placeholder buttons.

## Video generation

- `StudioWorkspace` keeps the shared Preview Stage; video output is shown there, never in a second preview surface.
- `VideoGenerationPanel` owns image-to-video/text-to-video form state and posts multipart input to `/api/generate-video`.
- The route authenticates with Supabase, validates settings and image bytes/dimensions, then calls the provider-neutral `lib/video/service.ts` boundary.
- No provider is currently configured. The route returns `VIDEO_SERVICE_NOT_CONFIGURED`; no mock output is returned and no credits are charged.
- A provider adapter must advertise supported resolutions and provider costs. Resolution options remain disabled unless advertised. Video credit rates and atomic debit/refund behavior must be established from real provider costs before enabling an adapter.

## Storage

- Buckets `inputs` and `outputs`, private. Serve via short-lived signed URLs.
- Inputs deleted after 30 days unless tied to a saved model. Run a scheduled cleanup.
