# Build Tasks (work in order, one at a time)

Prompt template for Copilot agent mode:
> Read .github/copilot-instructions.md and the docs referenced below. Implement **Task X.Y only**. List files you'll change first, then implement, add tests, and tell me how to verify.

Mark each task done only after you've tested it.

## Phase 0: Setup
- [ ] **0.1** Scaffold: Next.js + TS strict + Tailwind, ESLint, Prettier, Vitest, folder structure from `docs/ARCHITECTURE.md`. Add `.env.example`.
- [ ] **0.2** Create Supabase project; add `@supabase/ssr` clients (`client`, `server`, `admin`).
- [ ] **0.3** Connect repo to Vercel; add env vars; confirm a deploy works.

## Phase 1: Mode A (free depth relief)
- [ ] **1.1** `Dropzone` component with validation (type, ≤10 MB, ≥256 px) and preview.
- [ ] **1.2** Web Worker running a depth model via Transformers.js; show model download + inference progress.
- [ ] **1.3** `DepthMeshBuilder`: depth map → displaced plane geometry, photo as texture, adjustable depth-strength slider.
- [ ] **1.4** `ModelViewer`: orbit/zoom/pan, lighting, wireframe toggle, SSR disabled.
- [ ] **1.5** GLB export via `GLTFExporter` + download button.
- [ ] **1.6** Landing page with the Mode A demo (no signup). Handle unsupported-WebGL and low-memory cases.

## Phase 2: Accounts and database
- [ ] **2.1** Run `docs/DATABASE.md` SQL as a migration. Add tests for RLS, `start_job`, `refund_job`, `grant_credits`.
- [ ] **2.2** Email + Google auth, login/signup pages, auth callback, protected routes middleware.
- [ ] **2.3** Storage buckets and policies; signed URL helper.
- [ ] **2.4** Header shows plan and credit balance (read-only from `profiles`).

## Phase 3: Mode B (GPU)
- [ ] **3.1** GPU adapter interface + one provider implementation + mock provider for tests.
- [ ] **3.2** `POST /api/jobs` with Zod, rate limiting, daily cap, `start_job`, refund on submit failure.
- [ ] **3.3** `POST /api/gpu/webhook`: verify, store output, set status, refund on failure, idempotent.
- [ ] **3.4** `GET /api/jobs/[id]` + client polling hook + progress UI.
- [ ] **3.5** Background removal step before submission.
- [ ] **3.6** Stuck-job cleanup (scheduled) with refund.
- [ ] **3.7** Studio page: upload → progress → viewer; export GLB, plus OBJ and STL conversion.

## Phase 4: Payments
- [ ] **4.1** Create Stripe products/prices (test mode); wire env vars.
- [ ] **4.2** `POST /api/stripe/checkout` for Pro and Credit Pack.
- [ ] **4.3** `POST /api/stripe/webhook` per `docs/API.md` with signature verification and idempotency; tests with Stripe CLI fixtures.
- [ ] **4.4** Billing page: plan, credits, buy buttons, customer portal link.
- [ ] **4.5** Out-of-credits modal that links to billing.

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
