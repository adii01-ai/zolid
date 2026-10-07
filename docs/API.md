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

## Video generation

### GET /api/generate-video

Returns provider configuration and supported resolutions:
`{ ok: true, data: { configured: boolean, supportedResolutions: string[] } }`.

### POST /api/generate-video

Requires an authenticated Supabase session. Accepts multipart form data:

- `mode`: `image-to-video` or `text-to-video`
- `image`: required for image mode; JPG, PNG, or WebP, up to 10 MB and at least 256 px per side
- `prompt`: at most 200 characters; required for text mode
- `aspectRatio`: `16:9`, `9:16`, `1:1`, or `4:5`
- `duration`: `5`, `10`, or `15` seconds
- `resolution`: `480p`, `720p`, or `1080p`; accepted only when advertised by the configured provider

Success returns `{ ok: true, data: { videoUrl } }` with a provider-generated HTTPS URL. Errors use `{ ok: false, error: { code, message } }`. Currently no provider is configured, so valid requests return `503 VIDEO_SERVICE_NOT_CONFIGURED`; no mock video is returned or credit charged. Video credit rates and atomic debit/refund behavior remain pending actual provider-cost configuration.
