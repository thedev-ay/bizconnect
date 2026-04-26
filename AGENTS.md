# BizConnect — Agent Instructions

## App Overview

BizConnect is a **multi-tenant B2B business management platform**. Each tenant is a business workspace accessed at `/{tenant-slug}/...`. The platform is built on Next.js 15 App Router with server actions, Prisma + PostgreSQL (Neon), and NextAuth.

**Two apps share one database:**
- **Tenant app** (port 3000) — the workspace used by businesses and their staff.
- **Super-admin app** (port 3001) — platform management: create tenants, toggle which modules each tenant has access to.

### Super-Admin App
Routes: `/(admin)/dashboard`, `/(admin)/tenants`, `/(admin)/tenants/[tenantId]`, `/(admin)/modules`, `/(admin)/settings`.
- **Tenants page**: list all tenants, create new ones.
- **Tenant detail** (`[tenantId]`): toggle each module on/off for that tenant. Toggling fires `revalidateTag('tenant-modules:{slug}')` so the tenant app reflects changes within 60 seconds.
- **Modules page**: view all platform modules registered in the DB.
- Access requires the `isSuperAdmin` JWT claim (enforced by middleware).

### Sidebar Navigation
The sidebar is built dynamically from `getActiveModules()`. Items are grouped:
- **Main**: Dashboard, Users, Reports, Settings (always shown when accessible)
- **Business**: POS, Inventory, Job Orders, Services, Sales, Promotions, Loyalty, Appointments, Billing, CRM, HR
- **Ungrouped**: Assets (and any future modules not in a group — rendered below the Business group)

Branch switching is handled in the **WorkspacePill** at the top of the sidebar. When a tenant has multiple branches, it renders a dropdown to switch branches (calls `switchBranch()`, stored in session). Single-branch tenants see a static pill.

### Auth Flows
All auth routes are under `/{tenant}/...` and tenant-scoped:
- `/{tenant}/login` — credential login
- `/{tenant}/forgot-password` — request password reset email
- `/{tenant}/reset-password` — consume reset token and set new password
- Root `/login` — catch-all redirect to tenant login if no slug in URL

---

## Module Catalog

13 optional modules + 2 always-on core surfaces (dashboard, users). Each module has a `slug` in the DB and maps to a URL route segment. Middleware guards optional module routes via `tenantHasModule()`.

### Dashboard (core — always active)
- Adaptive KPI dashboard — only shows cards and sections relevant to the tenant's active modules.
- **Date range selector**: Today / This Week / This Month (via `?range=` query param).
- **Stat cards** (module-conditional): Revenue, Transactions, Active Job Orders, Today's Appointments, Total Customers, Pending Returns, Ready to Invoice, Low Stock Count, Pending Leave Requests.
- **Revenue chart** + **Transaction chart**: time-series charts for the selected range.
- **Overdue jobs panel**: job orders past their expected completion date.
- **Low-stock watchlist**: inventory items below reorder level with direct links.
- **Recent completed jobs**: last 5 completed job orders with invoice status.
- **Upcoming appointments**: next 5 confirmed/pending appointments.
- **Pending returns**: returns awaiting approval.
- Dashboard is a server component — all data fetched in a single parallel `Promise.all` on the server.

### Users (core — always active)
- Manage workspace users: create, edit, delete accounts.
- Assign roles: `owner`, `admin`, `staff`.
- **Permission system**: Owners and admins bypass all checks. Staff get a granular JSON permissions object (`module.action` keys).
- **User Groups**: Named permission templates (e.g. "Cashier", "Technician") that can be applied to users in bulk. Managed via the matrix editor at `modules/users/components/user-groups-matrix.tsx`.
- Permissions are edited per-user or via groups in `modules/users/components/permission-editor.tsx`.

### Inventory
- Product catalog with categories, SKU, barcode, cost price, selling price, quantity, reorder level.
- **Stock adjustments**: Add/remove stock with reason codes. Full adjustment history per item.
- **Low-stock panel**: Items below reorder level surfaced on dashboard.
- POS deducts stock atomically inside the same DB transaction as the sale.
- Permissions: `inventory.view/create/edit/delete`

### POS (Point of Sale)
- Cart-based terminal: add products (inventory items) and services as line items.
- **Product items**: deduct stock on sale. Validates quantity availability before committing.
- **Service items**: priced per-piece, per-kilo (weight-based), or flat.
- **Promotions**: applied per-item at checkout (percent off, flat off, fixed price, buy-X-get-Y, day/time-restricted).
- **Payment methods**: cash (calculates change), card, GCash, Maya, bank transfer, or split.
- Each sale generates a `referenceNo` in the format `TXN-YYYYMMDD-XXXX`.
- **Sales history**: filterable list with detail drawer per transaction.
- **Void**: cancel a completed sale (requires `pos.void`).
- **Returns**: initiate a return on a sale (requires `pos.process_return`). Returns have a pending → approved → refunded workflow with a separate approval step (requires `pos.approve_return`).
- **Offline POS**: sales are queued in IndexedDB when the network is unavailable and synced on reconnect.
- Permissions: `pos.view/process_sale/apply_discount/void/process_return/approve_return`

### Promotions
- Define promotions of 5 types: `percent_off`, `flat_off`, `fixed_price`, `buy_x_get_y`, `day_time`.
- Promotions can be linked to specific inventory items or apply globally.
- POS terminal resolves applicable promotions at cart-item level.
- Permissions: `promotions.view/create/edit/delete`

### Services
- Service catalog with pricing type: `per_piece`, `per_kilo`, `flat`.
- Services can be assigned to specific staff members (`StaffService`).
- Used as line items in POS and in Job Orders.
- Appointments book services against employees.
- Permissions: `services.view/create/edit/delete`

### Appointments
- Calendar view (FullCalendar) and list view.
- Book appointments for a customer against a service and an employee.
- Status lifecycle: pending → confirmed → completed / cancelled.
- Permissions: `appointments.view/create/status/cancel`

### Job Orders
- Repair/work order management with a **customizable Kanban board**.
- Workflow stages are per-tenant (e.g. Received → Diagnosis → Repair → QC → Ready → Released).
- Each job order can link to a CRM customer, an asset (customer's device), and service line items.
- **Staff assignment**: assign technicians to a job; each assignment records hours and a commission rate.
- **Claim payment**: marks a job order as paid and triggers invoice creation in Billing.
- Job numbers follow the format `JO-YYYYMM-XXXX`.
- Permissions: `job-orders.view/create/edit/status`

### CRM
- Customer contact book: name, phone, email, address, notes.
- Customers link to assets (their devices) and job orders.
- Job Order creation can fuzzy-match or create customers on the fly when CRM module is active.
- Permissions: `crm.view/create/edit/delete`

### Assets
- Track customer-owned equipment (devices, appliances, vehicles, etc.).
- Each asset belongs to a customer (CRM) and can be linked to a job order.
- Fields: asset type, brand, model, serial number, condition, notes.
- Permissions: `assets.view/create/edit/delete`

### Billing
- Invoice management: create invoices with line items, mark as paid.
- Invoices link 1:1 to a Job Order (created via the "Claim Payment" flow).
- Can also be created standalone.
- Permissions: `billing.view/create/edit/mark_paid`

### HR
- Employee records (separate from User accounts — a person can have both an `Employee` and a `User`).
- **Tabs**: Employees | Attendance | Leave | Payroll.
- Attendance: clock-in/clock-out records.
- Leave: leave requests with approval workflow.
- Payroll: payroll records per employee per period.
- Employees can be assigned to branches (`EmployeeBranchAssignment` with start/end dates and optional home branch).
- **Staff scheduling (embedded in HR page)**: the `modules/staff/` module has no standalone route — its `StaffCalendar` and `StaffProfileDialog` components are rendered inside the HR page. Staff tab shows a shift scheduling calendar (FullCalendar) and per-employee profile editing (commission rate, access level, assigned services, working hours per day-of-week). The staff module also owns service creation/deletion actions that revalidate both the staff and services routes.
- Permissions: `hr.view/attendance/leave/payroll`

### Loyalty
- Stamp-card loyalty program. Configurable stamps-per-reward via settings dialog.
- Customers receive a loyalty card; staff add stamps manually.
- Redemptions recorded separately.
- Permissions: `loyalty.view/create/stamp/redeem/settings`

### Reports
- Single route (`/reports`) with three sub-sections driven by `?section=` query param:
  - **Overview** (default): revenue chart, transaction chart, top-level KPIs. Available to all tenants.
  - **Sales** (`?section=sales`): detailed POS sales breakdown. Only shown when the POS module is active.
  - **Payments** (`?section=payments`): payment method breakdown, invoice totals. Shown when POS or Billing is active.
- Sub-section links appear in the sidebar under the Reports nav item (conditional on active modules).
- Date range is controlled by `?from=`, `?to=`, and `?granularity=` query params.
- Permissions: `reports.view`

### Settings (core — always active)
- Single route (`/settings`) with two tabs driven by `?tab=` query param:
  - **General** (`?tab=general`): business profile (name, address, phone, email, logo), currency settings.
  - **Business Hours** (`?tab=hours`): per-day open/close times used by appointments and display.
- Currency set here (symbol + locale) is used across all money formatting via `lib/currency.ts`.

### Branches (infrastructure — no standalone route)
- `modules/branches/` has no page route. Branch management is accessed via the **WorkspacePill** in the sidebar (owners/admins only).
- Actions: create branch, update branch, deactivate branch (minimum 1 branch enforced), switch active branch, assign employees to branches.
- Active branch stored in the session (`currentBranchId`). All module records (sales, job orders, inventory adjustments, etc.) are tagged with `branchId` at creation time.
- Branch switching triggers a session update (`unstable_update`) and full layout revalidation.

---

## Key Business Flows

### POS Sale
1. Staff opens terminal, adds product/service items to cart.
2. Promotions auto-apply per item at cart-item level.
3. Staff selects payment method and enters amount paid.
4. `createSale` action runs a DB transaction:
   - Validates stock availability for all product items.
   - Creates `Sale` + `SaleItem` records.
   - Decrements `InventoryItem.quantity` for each product item.
5. Reference number generated: `TXN-YYYYMMDD-XXXX`.
6. Sale marked `completed`. Change calculated and displayed.

### Return / Refund
1. Staff initiates return from Sales History (requires `pos.process_return`).
2. Return created with status `pending`, linked to original sale.
3. Manager reviews and approves (requires `pos.approve_return`) — selects refund method.
4. Status advances to `approved` → `refunded`.

### Job Order Lifecycle
1. Job order created with customer, asset (optional), service items, and initial stage.
2. Technicians assigned; status moved through Kanban stages.
3. On completion, "Claim Payment" triggers:
   - `Invoice` created in Billing with the job order's items.
   - Job order marked as paid.
4. Invoice can then be marked paid separately in Billing.

### Module Activation
1. Super-admin enables a module for a tenant via the admin app.
2. `TenantModule.isEnabled` set to `true`; `revalidateTag('tenant-modules:{slug}')` fires.
3. On next request, `getActiveModules()` returns the updated list.
4. Sidebar re-renders with the new module link.
5. Middleware allows routes to the newly-active module.

---

## Inter-Module Dependencies

| Module | Depends On |
|--------|-----------|
| POS | Inventory (stock deduction in same DB transaction), Services (line items), Promotions (per-item discounts) |
| Job Orders | CRM (customer lookup/creation), Assets (linked device), Services (line items), Billing (invoice created on "Claim Payment") |
| Appointments | Services (what is booked), HR employees (who performs it via `StaffService`) |
| Assets | CRM (owner customer) |
| Billing | Job Orders (primary source of invoice items via "Claim Payment") |
| Reports | POS (revenue/transaction data), Inventory (stock value, low-stock), Job Orders (active/overdue/completion KPIs), Billing (invoice/payment data) |
| Dashboard | All active modules (renders only the sections whose modules are enabled) |
| HR page | Staff module components (StaffCalendar, StaffProfileDialog embedded in the HR route) |
| Staff module actions | Services module (creates/deletes services, revalidates services route) |
| Loyalty | POS (stamps currently added manually; automatic POS-on-sale integration is a future enhancement) |
| All modules | Settings (currency symbol/locale via `lib/currency.ts`), Branches (`branchId` tagged on all records) |

---

## Styling
- Always use Tailwind classes, never inline styles

## Module Development
- When adding a new module, do not stop at pages, routes, or dialogs.
- Also evaluate whether the module needs reports, analytics, dashboards, KPIs, exports, or other reporting surfaces.
- Check dependencies and integration points with existing modules before considering the work complete. This includes shared data models, navigation, permissions, workflows, automations, and cross-module relationships.
- Call out any module-to-module dependencies explicitly if they are out of scope for the current task.

## Dialog Design Standard

### Default Patterns
- Use four patterns: `workspace dialog`, `compact dialog`, `confirm dialog`, and `detail drawer`.
- Do not force the full inventory-style layout onto tiny dialogs or destructive confirmations.

### Workspace Dialog
- Use for long create/edit flows and multi-section forms.
- Dialog shell: `p-0`, bordered container, scrollable body, pinned-feel footer.
- Header: bordered, consistent padding, title-first hierarchy, optional eyebrow, optional in-header close button.
- Body: dedicated scroll area with section grouping; avoid one long undifferentiated form block.
- Footer: bordered, consistent padding, secondary action + primary action, optional status/meta content on the left.

### Compact Dialog
- Use for short forms and utility tasks.
- Keep the same header/footer rhythm as workspace dialogs, but with a smaller shell and lighter body.
- Prefer consistent border, padding, and button alignment over custom one-off layouts.

### Confirm Dialog
- Use for destructive actions and simple confirmations.
- Keep these compact; do not add workspace-style section layouts.
- Standardize title, short supporting copy, and action button order.

### Detail Drawer
- Use for reviewing a record selected from a list, not for editing or creating.
- Shell: `Sheet` with `side="right"`, `sm:max-w-xl`, teal gradient background (`bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(236,253,250,0.92)_100%)]`), `border-l-white/70`.
- Header: eyebrow in `Module / State` format, title on the left, status badge on the right. Do not show a drawer close `X` by default; drawers should usually rely on backdrop click, Escape, or footer actions instead. Only add a close button if the interaction clearly needs it and the header still feels clean. `SheetDescription` shows key dates or meta below the title.
- Body: `space-y-5`, `p-4 sm:p-5`. Section cards use `rounded-[calc(var(--radius)+4px)] border border-border/70 bg-white/80`. Stat-style cards (single short label + single short value, like "Cash" or "3 items") use `rounded-[calc(var(--radius)+2px)]` with `shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]`. Do not use stat cards for multi-line content (e.g. name + email + dates) — use a plain cardless layout with stacked label+value, using `text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground` labels. When one side can have unpredictably long text (names, emails), use `flex gap-6` with `min-w-0 flex-1` on that side and `shrink-0` on the fixed side so long text truncates instead of squeezing the other column — grid columns don't protect against overflow the same way. Line items use simple flex rows with `qty × price` as a subtitle. Totals card uses `space-y-1.5 text-sm` with `tabular-nums` on amounts and `text-base font-semibold text-foreground` for the total row. Notes in their own plain card with a `text-muted-foreground` label.
- Footer: `border-border/70`, buttons are `size="sm" rounded-full`. Destructive actions use ghost style (`text-destructive hover:text-destructive`), not full-width or primary-colored.
- Current reference: the sale detail drawer in `modules/pos/components/sale-detail-dialog.tsx`.

### Mobile Bottom Sheet
- Use for mobile-only utility surfaces such as quick watchlists, recent activity, or lightweight embedded panels.
- Shell: `Sheet` with `side="bottom"`, `max-h-[88dvh]`, `rounded-t-[28px]`, the same teal gradient background as detail drawers (`bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(236,253,250,0.92)_100%)]`), and `border-t-white/70`.
- Header: add a visible drag handle, then use a bordered top section with compact padding, eyebrow in `Module / State` format, short title, and no default close `X`.
- Body: simple scroll area, usually `p-4`, and can embed an existing panel/component rather than recompose a full drawer-style detail layout.
- Footer: optional. Only add one when the sheet has real actions; otherwise let the content end naturally.
- Do not force the full right-side detail-drawer structure onto mobile bottom sheets.

### Header And Footer Consistency
- Prefer a consistent header treatment across dialogs: bordered top section, stable horizontal padding, clear title placement.
- Prefer eyebrow labels in the format `Module / State` when an eyebrow is used, such as `Inventory / New` or `Services / Edit`.
- Prefer dialog titles as the direct action label, such as `Add item`, `Edit service`, or `Create invoice`.
- Prefer a consistent footer treatment across dialogs: bordered action row, stable horizontal padding, primary and secondary buttons aligned the same way.
- Use `DialogFooter` as the standard footer primitive instead of ad hoc `<footer>` wrappers.
- Override the default `DialogFooter` spacing/layout so it matches the shared dialog shell rather than the primitive defaults. Current standard baseline: `mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30`.
- For most workspace and compact dialogs, pair that baseline with `px-6 py-4`. For denser legacy flows that intentionally use a tighter shell, keep their tighter padding but still use the same `DialogFooter` baseline reset.
- When a dialog is large enough to scroll, keep header and footer visually anchored while only the body scrolls.
- When the same dialog UI pattern appears more than once, prefer a shared component instead of duplicating markup.
- Current shared dialog building blocks include section wrappers and repeated field patterns such as numbered form sections and currency-prefixed numeric inputs.

### Form Control State
- Do not switch form controls between uncontrolled and controlled state during their lifetime.
- For Base UI `Select` components, prefer a stable controlled `value` from the first render.
- Use string fallbacks such as `""` or `"none"` instead of `undefined` when a selectable empty state is needed.
- Avoid patterns like `value={someValue || undefined}` on `Select` components.
- For select options backed by keys/codes/enums, store the key in `SelectItem value` but display the human-facing label as the item text and selected trigger text. Prefer shared option/label maps over recomputing display text from keys.

### Current Reference
- The inventory add-item dialog is the current visual reference for the workspace-dialog pattern.
- When updating existing dialogs, match its header/footer structure unless the dialog is clearly better suited to the compact or confirm pattern.

## List & Table Standards

### Search
- Place the search input inside the list/table component, not in the parent page or view.
- Use a rounded-full input with a leading `Search` icon: `rounded-full border border-border/60 bg-muted/30 py-2 pl-9 pr-4`.
- Reset pagination to page 0 whenever the query changes.
- Filter client-side when all data is already loaded. For server-paginated lists, debounce and pass as a query param instead.

### Empty States
- Use two distinct states: **no data** (list is genuinely empty) and **no results** (search/filter returned nothing).
- **No data** — full treatment: icon in a `rounded-2xl border border-border/60 bg-muted/60` box, bold title, muted subtitle. Render outside the table (early return or equivalent).
- **No results** — same icon+title+subtitle treatment inside a `TableCell` (desktop) or centered text block (mobile). Title: `No [items] matching "[query]"`. Subtitle: `Try a different search term.`
- Never show the "add your first X" copy when a search query is active.
- Current reference: inventory list (`modules/inventory/components/inventory-list.tsx`) and CRM customer list (`modules/crm/components/customer-list.tsx`).

## Feature Backlog

### Receipt / Document Scanning → Auto Inventory Update
Upload or scan supplier receipts/invoices to automatically update inventory stock levels.

**Approach:** Claude Vision API (claude-haiku-4-5) — send receipt image, extract structured line items, fuzzy-match to existing inventory products, show a confirmation/preview UI before applying changes.

**Why Claude API over in-browser AI:** In-browser models require a large model download (500MB–2GB) on first use, which is bad UX for a B2B tenant app. Claude API costs ~$0.001–0.002 per receipt — negligible.

**Implementation notes:**
- Always show a preview/confirmation step before committing stock changes
- Handle fuzzy matching between supplier item names and inventory product names
- Flag items on the receipt not found in inventory (offer to create new or skip)
- PDF support will need a page-to-image conversion step before sending to API
