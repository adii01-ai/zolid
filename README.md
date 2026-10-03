# Zolid: Image-to-3D SaaS (Project Docs)

Upload a photo, get an interactive 3D model. Free in-browser depth mode + paid GPU "full 3D object" mode.

## How to use these docs with GitHub Copilot

1. Create a new repo and a Next.js app (`npx create-next-app@latest`, TypeScript, Tailwind, App Router).
2. Copy this folder's contents into the repo root. Keep `.github/copilot-instructions.md` at that exact path: Copilot reads it automatically on every request.
3. Open `docs/TASKS.md` and work **one task at a time**. In Copilot Chat (agent mode) say:
   > Read docs/PRD.md, docs/ARCHITECTURE.md and docs/TASKS.md. Implement Task 1.1 only. Follow .github/copilot-instructions.md.
4. Review and test each task before starting the next.

## Document index

| File | Purpose |
|---|---|
| `.github/copilot-instructions.md` | Rules Copilot must follow in every response |
| `docs/PRD.md` | What we are building and why |
| `docs/ARCHITECTURE.md` | System design, folder structure, flows |
| `docs/DATABASE.md` | Supabase schema, RLS, SQL functions |
| `docs/API.md` | Route contracts and webhook behavior |
| `docs/SECURITY.md` | Security and abuse-prevention checklist |
| `docs/TASKS.md` | Ordered build checklist with Copilot prompts |
| `.env.example` | Required environment variables |
