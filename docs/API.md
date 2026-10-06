# API Contracts

All depth-generation routes require an authenticated Supabase session. Credit decisions are made by Postgres RPCs; the browser is never authoritative.

## POST /api/depth/generate

Accepts multipart form data with `file` as JPG, PNG, or WebP, up to 10 MB and at least 256 px on each side.

The route authenticates the user, decodes and validates the image, reserves one generation atomically, runs the depth model, and returns `{ reservationId, width, height, values }`. If image processing or inference fails, it cancels the reservation and returns an error without consuming a free generation or purchased credit. A depleted account receives `402` with `code: "GENERATION_LIMIT_REACHED"`.

## POST /api/depth/complete

Body: `{ reservationId: string }`.

Called when the relief mesh and viewer are ready. Postgres atomically changes the reservation to complete and either decrements `profiles.credits` (writing a ledger entry) or increments `profiles.free_generations_used`. The response returns the current free counters and purchased-credit balance. Completion is idempotent for the same reservation.

## POST /api/depth/cancel

Body: `{ reservationId: string }`.

Cancels an owned pending reservation after a viewer/client failure. Cancellation never changes the account balance. Reservations older than 30 minutes are also expired during later reservation attempts.

## Paid plans

Billing and plans are visible in the app, but payment checkout is not implemented. No paid credits are granted until verified payment processing is connected. Future credit pack amounts and plan allowances must come from server-side product configuration/payment metadata.
