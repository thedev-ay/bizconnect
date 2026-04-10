# BizConnect — Claude Context

## Styling
- Always use Tailwind classes, never inline styles

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
