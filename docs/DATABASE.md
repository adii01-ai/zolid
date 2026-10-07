# Database (Supabase / Postgres)

Apply `supabase/migrations/0001_depth_generation_credits.sql` to the existing Supabase project. It reuses `auth.users`, `public.profiles`, and `public.credit_ledger`; it does not introduce another account system.

## Allowance model

- `profiles.free_generations_used` starts at `0`.
- `profiles.free_generations_limit` starts at `3`.
- `profiles.credits` is the purchased-credit balance and starts at `0` for new accounts. This field is retained from the existing profile model.
- The auth-user trigger creates the profile and grants no purchased credits.

## Atomic generation lifecycle

1. `reserve_depth_generation()` locks the signed-in user's profile row, expires stale reservations, and reserves one purchased credit when available; otherwise it reserves one unused free generation. If neither is available, it raises `generation_limit_reached`.
2. The server runs image validation and depth inference. Any failure calls `cancel_depth_generation()`; neither free use nor purchased balance changes.
3. Once the depth map has built into the Three.js relief and the viewer is ready, `complete_depth_generation(reservation_id)` atomically deducts the reserved purchased credit or increments `free_generations_used`. The operation is idempotent for completed reservations.
4. Reservations older than 30 minutes are released on a later reservation attempt.

The profile-row lock serializes concurrent requests for one user. Reservation rows prevent simultaneous requests from claiming the same credit or free slot. SQL functions are `SECURITY DEFINER`, validate `auth.uid()`, and are executable only by authenticated users. Direct reservation-table access is not granted. Profile and ledger reads remain protected by RLS.

## Purchases

Stripe checkout grants credits only from its verified, idempotent server-side webhook through `grant_stripe_credit_bundle()`. The allowed credit amounts are maintained in the database function as well as `src/lib/billing/plans.ts`. When changing bundle credit quantities, apply a forward migration updating the function's allowlist before deploying the corresponding checkout configuration.

Migration `0004_update_credit_bundle_amounts.sql` updates that allowlist for the current 200-, 500-, and 1,000-credit bundles. Apply it to the production Supabase project before deploying the matching app configuration; otherwise webhook credit grants for the 200- and 1,000-credit packs will fail.

## Applying and testing

Use the Supabase migration workflow for the target project. No local Supabase/Postgres runtime is configured in this workspace, so the migration and concurrent-request cases must be exercised in a disposable Supabase test project before production rollout. Never run destructive allowance tests against production accounts.
