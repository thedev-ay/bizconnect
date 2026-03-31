---
name: BizConnect Project
description: Modular multi-tenant SaaS dashboard built from the Software Design Document
type: project
---

BizConnect is a modular multi-tenant SaaS dashboard (Phase 1 complete as of 2026-03-30).

**Architecture:** Turborepo monorepo with two Next.js 14 App Router apps sharing one PostgreSQL (Neon) database.

**Apps:**
- `apps/super-admin-app` — runs on port 3001, manages tenants and module activation
- `apps/tenant-app` — runs on port 3000, client-facing at `/[tenantSlug]/[module]`
- `packages/db` — shared Prisma schema + singleton client

**Why:** A configurable platform where each business (tenant) activates only the modules they need. Module activation is purely data-driven — no code changes or redeployment required.

**How to apply:** When adding features, always check if it belongs in a module folder (`modules/[name]/`) or in the shared infrastructure (`lib/`, `middleware.ts`).
