# Copilot Instructions: Zolid (Image-to-3D SaaS)

You are helping build a production SaaS. Read `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/SECURITY.md` before large changes.

## Stack
- Next.js (App Router) + TypeScript (strict) + Tailwind CSS
- React Three Fiber + @react-three/drei for 3D
- Transformers.js for in-browser depth estimation (Mode A)
- Supabase (Auth, Postgres, Storage) with `@supabase/ssr`
- Stripe (Checkout + webhooks)
- GPU worker via serverless provider behind an adapter interface (Mode B)
- Zod for all input validation

## Hard rules (never break)
1. **Entitlements and credits change only server-side**, from the Stripe webhook or SQL functions. Never trust query params like `?success=true`, never trust client state.
2. **Never expose secrets to the client.** Only `NEXT_PUBLIC_*` vars may reach the browser. The service-role key is used only in server code.
3. **Validate every API input with Zod.** Check auth on every protected route.
4. **Every table has Row Level Security.** Users can only read their own rows.
5. **Credit spending is atomic** (use the `start_job` SQL function). Failed jobs are refunded exactly once.
6. **Stripe webhook handlers are idempotent** (store `stripe_event_id`, verify the signature with the raw body).
7. **No hard-coded model names, prices, or URLs.** Use env vars or config files.
8. Mode A images must never be uploaded to our servers.
9. Wrap `three`/R3F components with `dynamic(..., { ssr: false })`.
10. Do not use `localStorage` for anything security- or billing-related.

## Code style
- TypeScript strict, no `any`. Small functions, early returns.
- Server logic in `src/lib/server/*`, shared types in `src/types/*`.
- Return typed JSON: `{ ok: true, data }` or `{ ok: false, error: { code, message } }`.
- Handle loading, empty, and error states in every UI component.
- Add a test for every pure function and every API route's happy path and main failure path (Vitest).
- Accessible UI: labels, keyboard focus, sufficient contrast.

## Working method
- Implement **one task from `docs/TASKS.md` at a time**. Do not build ahead.
- Before coding, list the files you will create or change.
- After coding, state how to test it manually and which tests were added.
- If a requirement is unclear or conflicts with these docs, ask instead of guessing.
- Do not add libraries not listed above without saying why.

## Out of scope for v1
Text-to-3D, multi-image/video input, rigging/animation, teams, mobile apps, public marketplace, knowledge-graph mode.
