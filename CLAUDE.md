# BizConnect — Claude Context

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
- Header: eyebrow in `Module / State` format, title on the left, status badge on the right. Add `pr-10` to `SheetHeader` to prevent the default close button from overlapping the badge. `SheetDescription` shows key dates or meta below the title.
- Body: `space-y-5`, `p-4 sm:p-5`. Section cards use `rounded-[calc(var(--radius)+4px)] border border-border/70 bg-white/80`. Stat-style cards (single short label + single short value, like "Cash" or "3 items") use `rounded-[calc(var(--radius)+2px)]` with `shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]`. Do not use stat cards for multi-line content (e.g. name + email + dates) — use a plain cardless layout with stacked label+value, using `text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground` labels. When one side can have unpredictably long text (names, emails), use `flex gap-6` with `min-w-0 flex-1` on that side and `shrink-0` on the fixed side so long text truncates instead of squeezing the other column — grid columns don't protect against overflow the same way. Line items use simple flex rows with `qty × price` as a subtitle. Totals card uses `space-y-1.5 text-sm` with `tabular-nums` on amounts and `text-base font-semibold text-foreground` for the total row. Notes in their own plain card with a `text-muted-foreground` label.
- Footer: `border-border/70`, buttons are `size="sm" rounded-full`. Destructive actions use ghost style (`text-destructive hover:text-destructive`), not full-width or primary-colored.
- Current reference: the sale detail drawer in `modules/pos/components/sale-detail-dialog.tsx`.

### Header And Footer Consistency
- Prefer a consistent header treatment across dialogs: bordered top section, stable horizontal padding, clear title placement.
- Prefer eyebrow labels in the format `Module / State` when an eyebrow is used, such as `Inventory / New` or `Services / Edit`.
- Prefer dialog titles as the direct action label, such as `Add item`, `Edit service`, or `Create invoice`.
- Prefer a consistent footer treatment across dialogs: bordered action row, stable horizontal padding, primary and secondary buttons aligned the same way.
- When a dialog is large enough to scroll, keep header and footer visually anchored while only the body scrolls.
- When the same dialog UI pattern appears more than once, prefer a shared component instead of duplicating markup.
- Current shared dialog building blocks include section wrappers and repeated field patterns such as numbered form sections and currency-prefixed numeric inputs.

### Form Control State
- Do not switch form controls between uncontrolled and controlled state during their lifetime.
- For Base UI `Select` components, prefer a stable controlled `value` from the first render.
- Use string fallbacks such as `""` or `"none"` instead of `undefined` when a selectable empty state is needed.
- Avoid patterns like `value={someValue || undefined}` on `Select` components.

### Current Reference
- The inventory add-item dialog is the current visual reference for the workspace-dialog pattern.
- When updating existing dialogs, match its header/footer structure unless the dialog is clearly better suited to the compact or confirm pattern.

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
