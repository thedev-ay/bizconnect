---
name: BizConnect Build Status
description: What has been built and what remains for the bizconnect project
type: project
---

**Completed (Phase 1):**
- Monorepo root: turbo.json, package.json, .gitignore, .prettierrc
- `packages/db`: Prisma schema (all 11 models), seed script, singleton client
- `super-admin-app`: auth (NextAuth credentials, isSuperAdmin JWT), middleware, dashboard, tenants list, tenant detail with module toggles (Switch UI → PATCH /api/tenants/[id]/modules), modules page, settings page
- `tenant-app`: auth (NextAuth credentials, tenantSlug in JWT), middleware (route guard + tenant isolation), module-registry.ts (getActiveModules cached + tenantHasModule for middleware), tenant.ts, dynamic [tenant]/layout.tsx with sidebar built from active modules, dashboard page
- Modules built: users (core), inventory (optional), pos (optional) — each with { components, actions, schema, types, index.ts } structure

**Still to build (future phases):**
- Appointments, Billing, HR, Reports, Job Orders, CRM modules
- Reports & Analytics pages (Recharts/Tremor)
- Super admin: create tenant user accounts
- Tenant app: profile/settings page, password change
- Redis caching layer for module-registry at scale

**Setup steps for the user:**
1. `npm install` from root
2. Copy .env.example → .env.local in both apps, fill Neon credentials + NEXTAUTH_SECRET
3. `cd packages/db && npm install && npx prisma generate && npx prisma db push && npm run db:seed`
4. `npm run dev` from root — starts both apps

**Why:** The SDD specified Phase 1 (foundation) must be complete before module work. Module registry and middleware are the backbone.

**How to apply:** When resuming this project, check current status against this list before adding new modules.
