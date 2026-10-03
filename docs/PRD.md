# PRD: Image-to-3D SaaS (working name: "Zolid")

**Version:** 0.1 draft  |  **Date:** Oct 3, 2026  |  **Status:** For review

## 1. Summary

A web app where anyone uploads a photo and gets an interactive 3D model they can rotate and download. A free in-browser **depth mode** attracts users; a paid **full 3D object mode** (GPU model) generates complete textured meshes.

## 2. Problem

Making a 3D model from a photo today means learning Blender or photogrammetry, or using tools that are expensive, slow, or require installs. Designers, game developers, makers, sellers, and hobbyists want a fast "photo in, 3D file out" workflow.

## 3. Target Users

| Persona | Need |
|---|---|
| Indie game dev / 3D hobbyist | Quick base meshes to import into Blender/Unity |
| Maker / 3D printer owner | STL from a photo of an object |
| E-commerce seller | Rotatable 3D view of a product |
| Designer / student | Fast prototypes and visual effects |

## 4. Goals and Non-Goals

**Goals**
- A first-time visitor sees a 3D result within 60 seconds, with no signup.
- Full 3D generation completes in under 2 minutes for 95% of jobs.
- Gross margin of at least 65% on paid generations.
- Charge real money within 6 weeks of starting the build.

**Non-goals (v1)**
- Multi-image or video photogrammetry
- Text-to-3D
- Rigging and animation
- Team workspaces, public marketplace, mobile apps
- Knowledge-graph mode (deferred to v2)

## 5. Product Modes

| Mode | Input | Output | Where it runs | Cost to us |
|---|---|---|---|---|
| **A. Depth relief (free)** | 1 photo | Front-facing 3D relief, GLB/OBJ/PLY | User's browser | $0 |
| **B. Full 3D object (paid)** | 1 photo, ideally clean background | Complete textured mesh, GLB/OBJ/STL | GPU worker | Cents per run |

Hidden sides in Mode B are AI-generated guesses. The UI must say so.

## 6. User Flow

1. Land on homepage, upload a photo, and try Mode A with no account.
2. Sign up (email or Google) to unlock Mode B and receive free credits.
3. Upload photo, optional automatic background removal, confirm.
4. Job is queued; progress bar and status shown.
5. View model in 3D viewer; download in chosen format.
6. When credits run out, buy a plan or credit pack.
7. Past models are listed in a personal gallery.

## 7. Functional Requirements

### P0 (must have for launch)

| ID | Requirement |
|---|---|
| F1 | Image upload (JPG/PNG/WebP, max 10 MB, min 256 px) with client-side validation |
| F2 | Mode A: in-browser depth estimation, mesh generation, textured preview |
| F3 | 3D viewer: orbit, zoom, pan, lighting, wireframe toggle |
| F4 | Export: GLB for both modes; OBJ and STL for Mode B |
| F5 | Auth: email and Google sign-in |
| F6 | Mode B: job creation, queue, status polling, result storage |
| F7 | Automatic background removal before Mode B |
| F8 | Credit system: signup bonus, deduction on job start, automatic refund on failure |
| F9 | Stripe Checkout for plans/credit packs; **webhook is the only way credits or plan change** |
| F10 | Gallery of the user's past models (view, download, delete) |
| F11 | Rate limits per user and IP; daily GPU spend cap |
| F12 | Terms of Service, Privacy Policy, content policy page |

### P1 (soon after launch)
- Share link to a public viewer page
- Quality presets (fast / high)
- Email notification when a job finishes
- Basic usage dashboard and billing portal

### P2 (later)
- API access, batch uploads, mesh cleanup/decimation, knowledge-graph mode, teams

## 8. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Mode A result in under 15 s on a mid-range laptop; Mode B p95 under 120 s |
| Reliability | Failed jobs are retried once, then fail with automatic refund |
| Security | Row-level security on all user data; signed URLs for files; secrets only server-side |
| Privacy | Mode A images never leave the device; Mode B images deleted after 30 days unless saved by user |
| Compatibility | Latest Chrome, Safari, Edge, Firefox; WebGL2 required; graceful message on unsupported devices |
| Accessibility | Keyboard-operable controls, readable contrast, alt text |

## 9. Technical Approach

- **Frontend:** Next.js, React Three Fiber, drei; Transformers.js for depth estimation
- **Backend:** Next.js API routes; Supabase (Auth, Postgres, Storage)
- **GPU worker:** open-source image-to-3D model on pay-per-second serverless GPU (Modal, Replicate, or RunPod). **Model choice is an open decision; verify commercial license before launch.**
- **Payments:** Stripe Checkout and webhooks
- **Hosting:** Vercel

**Data model (core tables)**
- `profiles`: user id, plan, credits
- `jobs`: id, user id, status (queued/running/done/failed), input path, output path, error, timestamps
- `credit_ledger`: user id, delta, reason, job id, timestamp

## 10. Monetization

| Tier | Includes |
|---|---|
| Free | Unlimited Mode A, about 3 Mode B credits at signup |
| Credit pack | One-time purchase of generations |
| Pro (monthly) | Monthly credit allowance, higher quality, priority queue, longer storage |

Pricing rule: **price per generation at least 3x measured GPU cost.** Exact prices are set after Phase 2 cost measurement.

## 11. Success Metrics

| Metric | Target (first 90 days after launch) |
|---|---|
| Visitor to Mode A try | 40% |
| Mode A user to signup | 10% |
| Signup to first Mode B job | 50% |
| Free to paid conversion | 3% |
| Job success rate | 95% or higher |
| Gross margin on paid usage | 65% or higher |
| 30-day retention of paying users | 60% |

## 12. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Model license forbids commercial use | Check license first; keep a swap-in alternative model |
| GPU cost spikes or abuse | Login required for GPU, rate limits, spend cap, credit system |
| Output quality disappoints on messy photos | Background removal, clear UI guidance, example gallery |
| Users upload copyrighted or harmful images | Content policy, reporting, ability to remove content |
| Payment fraud or unlock bypass | Webhook-only entitlements, never URL parameters |
| Cold-start latency on serverless GPU | Progress UI, set expectations, consider warm instance if volume justifies |

## 13. Milestones

| Week | Deliverable |
|---|---|
| 1 | Upload, Mode A, viewer, GLB export |
| 2 | Auth, storage, profiles, RLS |
| 3 | GPU worker, job queue, Mode B end to end |
| 4 | Credits, Stripe, webhook |
| 5 | Gallery, rate limits, error handling and refunds |
| 6 | Landing page, legal pages, closed beta (10-20 users) |

## 14. Open Questions

1. Which image-to-3D model gives the best quality with a commercial-friendly license?
2. Which GPU provider gives the lowest real cost per generation?
3. Final product name and domain?
4. Credit packs only, subscription only, or both at launch?
5. Which countries will we sell to (affects tax and Stripe setup)?

## 15. Next Step

Approve this PRD, then start Week 1: project setup, upload UI, browser depth mode, viewer, and GLB export.
