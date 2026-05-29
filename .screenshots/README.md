# `.screenshots/` — visual regression + asset rendering

Two purposes:

1. **Render brand assets** — the three OG images (1200×630) are HTML templates rendered to PNG via Playwright. Editing visuals in HTML/CSS is faster than wrestling SVG by hand.
2. **Visual smoke-test** — quick scripts to log in and capture a tour of key pages, so you can eyeball a UI change before merging.

The rendered `.png` outputs are gitignored — re-run any script to regenerate.

## What's here

| File                       | Purpose                                                          |
|----------------------------|------------------------------------------------------------------|
| `tour.mjs`                 | Authenticated tour: login + 8 portal/admin pages, full-page PNG  |
| `tour-mini.mjs`            | Trimmed 4-page tour with a `<tag>` filename prefix for diffing   |
| `render-og.mjs`            | Render Acme OG only                                              |
| `render-og-all.mjs`        | Render all three brand OGs in one Playwright session             |
| `og-template.html`         | Acme Capital OG source (cream paper, slab serif, "Confidential" stamp) |
| `og-greenwood.html`        | Greenwood Holdings OG source (Penguin Classics paperback treatment) |
| `og-lighthouse.html`       | Lighthouse Labs OG source (split-screen, beam gradient, "The Ask") |

## Usage

```bash
# One-time install (already in node_modules if you've installed dev deps):
npm install --no-save playwright
npx playwright install chromium

# Render all three OG images
node .screenshots/render-og-all.mjs

# Visual smoke test (server must be running on :3000)
node .screenshots/tour.mjs

# Tag screenshots so you can diff before/after an example swap
node .screenshots/tour-mini.mjs greenwood
npx tsx bin/use-example.ts acme-capital --yes
node .screenshots/tour-mini.mjs acme
# now .screenshots/{greenwood,acme}-{login,portal,team,admin}.png exist
```

The auth credentials at the top of `tour.mjs` (`admin@example.com` / `demo-tour-quick-2026`) are placeholders. Edit the file to match whatever you typed into the wizard (or whatever it auto-generated for you and printed at the end of setup) before running the tour.
