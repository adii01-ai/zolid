# Build Tasks (work in order, one at a time)

Prompt template for Copilot agent mode:

> Read .github/copilot-instructions.md and the docs referenced below. Implement **Task X.Y only**. List files you'll change first, then implement, add tests, and tell me how to verify.

Mark each task done only after you've tested it.

## Phase 0: Setup

- [ ] **0.1** Scaffold: Next.js + TS strict + Tailwind, ESLint, Prettier, Vitest, folder structure from `docs/ARCHITECTURE.md`. Add `.env.example`.
- [ ] **0.2** Create Supabase project; add `@supabase/ssr` clients (`client`, `server`, `admin`).
- [ ] **0.3** Connect repo to Vercel; add env vars; confirm a deploy works.

## Phase 1: Depth relief

- [ ] **1.1** `Dropzone` component with validation (type, ≤10 MB, ≥256 px) and preview.
- [ ] **1.2** Web Worker running a depth model via Transformers.js; show model download + inference progress.
- [ ] **1.3** `DepthMeshBuilder`: depth map → displaced plane geometry, photo as texture, adjustable depth-strength slider.
- [ ] **1.4** `ModelViewer`: orbit/zoom/pan, lighting, wireframe toggle, SSR disabled.
- [ ] **1.5** GLB export via `GLTFExporter` + download button.
- [ ] **1.6** Landing page with the Mode A demo (no signup). Handle unsupported-WebGL and low-memory cases.

## Phase 2: Accounts and database

- [ ] **2.1** Apply the depth allowance migration and test RLS plus atomic reserve/complete/cancel behavior in a disposable Supabase project.
- [ ] **2.2** Email + Google auth, login/signup pages, auth callback, protected routes middleware.
- [ ] **2.3** Storage buckets and policies; signed URL helper.
- [ ] **2.4** Header shows plan and credit balance (read-only from `profiles`).

## Phase 3: Generation allowance

- [ ] **3.1** Apply the depth allowance migration and verify new profiles start with three free generations and zero purchased credits.
- [ ] **3.2** Exercise reserve/complete/cancel behavior, including simultaneous requests and inference failures, in a disposable Supabase project.
- [ ] **3.3** Add paid plan checkout only after server-side payment verification and configurable product credit metadata are available.

## Phase 4: Payments (pending)

- [ ] **4.1** Configure paid products and generation-credit allowances from trusted server-side metadata.
- [ ] **4.2** Implement authenticated checkout and signature-verified, idempotent payment webhooks.
- [ ] **4.3** Grant purchased credits only after verified payment; test failed, replayed, and refunded payments.

## Phase 5: Product polish

- [ ] **5.1** Gallery page: list, view, download, delete.
- [ ] **5.2** Error boundaries, empty states, toasts, loading skeletons.
- [ ] **5.3** Security headers, CSP, `npm audit`, work through `docs/SECURITY.md`.
- [ ] **5.4** Analytics (privacy-friendly) and basic admin view of job counts, failures, GPU cost.

## Phase 6: Launch

- [ ] **6.1** Terms, Privacy, content policy pages; footer links.
- [ ] **6.2** Switch Stripe to live mode in production only; run a real small payment end to end.
- [ ] **6.3** Closed beta with 10-20 users; measure cost per generation; set final prices at 3x or more of that cost.
- [ ] **6.4** Public launch checklist: monitoring, error alerts, backups, support email.

## Phase 7: Video generation (approved; provider pending)

- [ ] **7.1** Add provider-neutral authenticated video generation API, Studio modes, input validation, and real-result preview. Keep generation unavailable until a real provider adapter and supported resolutions are configured; do not charge credits until provider costs and atomic credit rules are defined.
- [ ] **7.2** Configure a production video provider, supported output settings, cost limits, and atomic per-generation credit policy; test real success, failure, timeout, and refund behavior before enabling generation.
