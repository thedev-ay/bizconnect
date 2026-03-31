# BizConnect — Setup Guide

## Quick Start

### 1. Install root dependencies
```bash
npm install
```

### 2. Configure environment variables

Copy the example files and fill in your Neon PostgreSQL credentials:

```bash
cp apps/super-admin-app/.env.example apps/super-admin-app/.env.local
cp apps/tenant-app/.env.example apps/tenant-app/.env.local
```

Get your connection strings from [neon.tech](https://neon.tech):
- `DATABASE_URL` — pooled connection (Neon → Connection Details → Pooled)
- `DIRECT_URL` — direct connection (Neon → Connection Details → Direct)

Generate NextAuth secrets:
```bash
openssl rand -base64 32   # for super-admin-app
openssl rand -base64 32   # for tenant-app (use a DIFFERENT value)
```

### 3. Install DB package dependencies and generate Prisma client
```bash
cd packages/db
npm install
npx prisma generate
```

### 4. Push schema to database
```bash
npx prisma db push
```

### 5. Seed the database
```bash
npm run db:seed
```

This creates:
- All 9 platform modules
- Super admin account: `admin@bizconnect.app` / `SuperAdmin123!`
- Demo tenant: slug `demo`
- Demo tenant user: `owner@demo.com` / `DemoAdmin123!`
- Active modules for demo: users, inventory, pos, reports

### 6. Start development servers

From the project root:
```bash
npm run dev
```

Or start individually:
- Super Admin App: http://localhost:3001 — `cd apps/super-admin-app && npm run dev`
- Tenant App: http://localhost:3000 — `cd apps/tenant-app && npm run dev`

### 7. Test the system

**Super Admin flow:**
1. Go to http://localhost:3001
2. Login: `admin@bizconnect.app` / `SuperAdmin123!`
3. Create a new tenant → toggle modules on/off

**Tenant user flow:**
1. Go to http://localhost:3000/demo/login
2. Login: `owner@demo.com` / `DemoAdmin123!`
3. Navigate the sidebar — only active modules appear
4. Go to super admin and toggle the inventory module off → refresh the tenant app → inventory disappears from the sidebar

---

## Architecture

```
bizconnect/
├── packages/
│   └── db/                    ← Shared Prisma schema + client
│       ├── prisma/
│       │   ├── schema.prisma  ← Single source of truth for DB
│       │   └── seed.ts        ← Module registry + demo data
│       └── src/
│           └── index.ts       ← Singleton Prisma client
└── apps/
    ├── super-admin-app/       ← Port 3001
    │   ├── app/(admin)/
    │   │   ├── dashboard/     ← Platform metrics
    │   │   ├── tenants/       ← List + manage tenants
    │   │   │   └── [tenantId] ← Module toggles (the key feature)
    │   │   └── modules/       ← View all platform modules
    │   └── middleware.ts      ← Requires isSuperAdmin JWT claim
    └── tenant-app/            ← Port 3000
        ├── lib/
        │   ├── module-registry.ts  ← THE most critical file
        │   └── tenant.ts           ← Tenant resolution
        ├── app/
        │   └── [tenant]/
        │       ├── layout.tsx      ← Dynamic sidebar built from active modules
        │       ├── dashboard/
        │       ├── users/          ← Core module (always active)
        │       ├── inventory/      ← Optional (middleware-guarded)
        │       └── pos/            ← Optional (middleware-guarded)
        ├── modules/
        │   ├── users/         ← { components, actions, schema, types, index.ts }
        │   ├── inventory/     ← Same structure
        │   └── pos/           ← Same structure
        └── middleware.ts      ← Route guard using module-registry
```

## Adding a New Module

1. **Add to DB seed** (`packages/db/prisma/seed.ts`):
   ```ts
   { slug: "appointments", name: "Appointments", icon: "Calendar", isCore: false, sortOrder: 3 }
   ```

2. **Add route mapping** (`apps/tenant-app/lib/module-registry.ts`):
   ```ts
   appointments: "appointments",
   ```

3. **Create module folder** (`apps/tenant-app/modules/appointments/`):
   ```
   components/
   actions.ts
   schema.ts
   types.ts
   index.ts
   ```

4. **Create page** (`apps/tenant-app/app/[tenant]/appointments/page.tsx`)

5. **Re-seed** (`cd packages/db && npm run db:seed`)

That's it — no middleware changes, no sidebar changes, no redeployment needed to activate per tenant.

## Deployment

| Component       | Platform        | URL                        |
|----------------|-----------------|----------------------------|
| super-admin-app | Vercel          | admin.yourdomain.com       |
| tenant-app      | Vercel          | app.yourdomain.com/[slug]  |
| Database        | Neon Serverless | (managed)                  |

Both apps share the same Neon database. Set the same `DATABASE_URL` and `DIRECT_URL` in both apps' Vercel environment variables, with DIFFERENT `NEXTAUTH_SECRET` values.
