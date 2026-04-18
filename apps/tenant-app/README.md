# Tenant App

The tenant app is the workspace-facing Next.js app in BizConnect.

## Run locally

From the repo root:

```bash
npm run dev
```

Open `http://localhost:3000/<tenant-slug>/login` in your browser.

## Capture screenshots

The repo includes a reusable screenshot script that can capture:

- tenant app pages
- auth pages
- dialog states

Run it from the repo root:

```bash
npm run screenshots:tenant -- \
  --tenant retail-company-1 \
  --email retail1@example.com \
  --password 'Summer1$'
```

Screenshots are saved under:

```bash
artifacts/tenant-app-screenshots/<tenant-slug>
```

Dialog screenshots are saved under:

```bash
artifacts/tenant-app-screenshots/<tenant-slug>/dialogs
```

### Useful options

```bash
--pages-only
--dialogs-only
--base-url http://localhost:3000
--output-dir artifacts/tenant-app-screenshots
--chrome-path /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
--width 1440
--height 1200
```

### Direct script usage

```bash
node scripts/capture-tenant-screenshots.mjs \
  --tenant retail-company-1 \
  --email retail1@example.com \
  --password 'Summer1$'
```

## Notes

- The script uses headless Google Chrome through the DevTools protocol.
- Protected pages require valid tenant credentials.
- `reset-password` screenshots use the page route directly; a real reset token is still needed if you want the active reset form state instead of the invalid-link state.
