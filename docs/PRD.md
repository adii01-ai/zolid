# PRD: Zolid Depth Relief Studio

**Version:** 0.2 draft | **Date:** Oct 5, 2026 | **Status:** For review

## 1. Summary

Zolid turns one uploaded image into an interactive front-facing depth relief that users can inspect and export as GLB. The product supports depth relief only.

## 2. Product flow

1. Upload an image or select one of the local examples.
2. Generate a depth map and view the relief in the existing Three.js viewer.
3. Rotate, zoom, pan, adjust depth strength, and export GLB.
4. New accounts receive three free successful generations.
5. After free generations are used, generation requires purchased account credits. Paid checkout is pending and must never issue credits before verified payment.

## 3. Generation allowance

- `free_generations_used` starts at 0 and is incremented only after the relief viewer is ready.
- `free_generations_limit` defaults to 3 and is configurable per profile.
- `profiles.credits` remains the purchased-credit balance and starts at 0.
- Purchased credits are reserved before free generations.
- The database enforces availability; refreshes, additional tabs, and frontend state changes cannot bypass it.
- Failed inference or viewer setup cancels the reservation without consuming allowance.
- Concurrent requests are serialized with a profile-row lock and reservation records.

## 4. Functional requirements

| ID  | Requirement                                                                                     |
| --- | ----------------------------------------------------------------------------------------------- |
| F1  | Accept JPG, PNG, and WebP images up to 10 MB and at least 256 px on each side.                  |
| F2  | Offer local example images through the existing upload state.                                   |
| F3  | Run depth estimation and build the front-facing relief geometry.                                |
| F4  | Keep the existing 3D viewer controls and GLB export.                                            |
| F5  | Require a signed-in user for persistent allowance tracking.                                     |
| F6  | Enforce free and purchased balances with authenticated atomic database functions.               |
| F7  | Deduct only after successful depth inference and viewer setup; release reservations on failure. |
| F8  | Show remaining free generations and a plans link after allowance is exhausted.                  |
| F9  | Do not grant purchased credits until verified payment processing is implemented.                |
| F10 | Preserve recent model/history UI.                                                               |

## 5. Payments

Billing plans are displayed as pending while payment checkout is unimplemented. Prices and credit quantities must be read from trusted server-side product configuration. Only a verified, idempotent payment webhook may grant paid credits.

## 6. Security and data

- Supabase `auth.users` is the sole user identity source.
- Existing `profiles.credits` stores purchased credits; no duplicate user or balance table is added.
- RLS protects user-readable profile and ledger data.
- SECURITY DEFINER RPCs validate `auth.uid()` and perform reservation, completion, and cancellation atomically.
- Images are sent to the authenticated server route for depth inference; the application must disclose its retention policy before launch.

## 7. Out of scope

Complete object reconstruction, text-to-3D, multi-image reconstruction, subscriptions, and payment checkout until separately implemented and verified.
