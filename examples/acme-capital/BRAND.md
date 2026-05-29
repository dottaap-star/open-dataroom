# Acme Capital — Brand Guidelines

> A mid-century industrial-catalogue startup, reframed as a B2B fundraise. The data room is a fictitious investor portal for a Looney-Tunes-Acme company that sells anvils, dynamite, and rocket skates — at SaaS margins. Use this document when extending the Acme example (adding pages, writing copy, picking colours).

**Version 1.0** · maintained alongside the `examples/acme-capital/` dataset.

---

## 1. The brand in one paragraph

Acme Capital is the only investor data room that quotes its catalogue like scripture. The voice is dry, deadpan-corporate, and lightly absurd: every example reaches for an anvil, every metric is grounded in dynamite-cohort retention, every founder bio is delivered with a straight face. Visually it borrows from the mid-century industrial-supply catalogue — burnt orange ink stamped onto cream paper, slab-serif headlines, technical-drawing illustrations rendered with the seriousness of a 1953 trade-show brochure. Cartoony but never goofy. The joke is the rigour with which the company believes its own catalogue.

## 2. Voice & tone

| Trait              | Do                                                                       | Don't                                                                |
|--------------------|--------------------------------------------------------------------------|----------------------------------------------------------------------|
| **Tone**           | Dry, deadpan, mid-century corporate — write like a serious sales rep     | Wink at the camera. Never break the fourth wall.                     |
| **Examples**       | Always reach for an anvil, dynamite, or a rocket skate                   | Generic SaaS language ("solutions", "leverage", "synergies")         |
| **Numbers**        | Ground in the catalogue. "Anvil unit economics", "dynamite cohort"       | Round, abstract metrics ("MRR grew 30%")                             |
| **Citations**      | Cite the catalogue like scripture — Section 14B, Page 312, etc.           | "As mentioned earlier" — too informal for the brand                  |
| **Hedging**        | None. The catalogue is the source of truth.                              | "It depends" / "various factors" — Acme has answers                  |
| **Coyote**         | "We are unable to confirm whether Wile E. Coyote is still in the building" | Confirm or deny Wile E.'s status                                    |

**Hero sentence** (use on the auth panel, the OG image, the pitch deck cover):

> Anvils. Dynamite. Rocket skates. **At SaaS margins.**

**Tagline alternates** (rotation OK):
- Industrial Solutions Since 1949
- The Catalogue, Capitalised
- Every Product Tested in the Field. Eventually.

**Forbidden words:** *"solutions"*, *"leverage" (as verb)*, *"synergy"*, *"disrupt"*, *"AI-powered"*, *"revolutionary"*, *"game-changing"*.

---

## 3. Logo system

### 3.1 Primary mark

```
★ ACME CAPITAL
  EST. 1948 — INDUSTRIAL CATALOGUE
```

- **Star** to the left, filled in `--color-brand-700` (#B45309), with a small reverse-knockout interior star.
- **Wordmark** "ACME CAPITAL" set in IBM Plex Serif Bold, all-caps, +4% letter-spacing.
- **Strapline** "EST. 1948 — INDUSTRIAL CATALOGUE" set in IBM Plex Mono Medium, +20% letter-spacing, all-caps, in a warm muted ink (`#8A6B3B`).

File: `public/assets/branding/logo-light.svg` (320×80 viewBox). On dark surfaces use `logo-dark.svg` — star becomes mustard, wordmark becomes cream.

### 3.2 Favicon

A single capital **A** in IBM Plex Serif Bold, knockout cream on a burnt-orange rounded square, with a mustard dot in the upper-right. 64×64 SVG, scales cleanly.

### 3.3 Clear space

Minimum clear space around the logo equals the height of the strapline. Never crop the star. Never resize the wordmark independently of the star.

### 3.4 Minimum size

The full logo with strapline reads down to 200px wide. Below that, use the wordmark-only variant (drop the strapline) down to 140px. Below 140px, use the favicon mark.

### 3.5 Don'ts

- Don't recolour the star to anything outside the brand palette.
- Don't add a drop shadow.
- Don't put the logo on photography without a solid colour underlay.
- Don't render the wordmark in any font other than IBM Plex Serif Bold.

---

## 4. Colour

### 4.1 Brand ramp — burnt orange

| Token       | Hex     | Use                                                  |
|-------------|---------|------------------------------------------------------|
| `brand-25`  | #FEFBF6 | Wash backgrounds — alternating row tints              |
| `brand-50`  | #FFF7ED | Nav active state, badge backgrounds, icon wash        |
| `brand-100` | #FFEDD5 | Hover state on brand wash                             |
| `brand-200` | #FED7AA | Border on brand wash badges                           |
| `brand-300` | #FDBA74 | Focus-ring stop, light brand accents                  |
| `brand-400` | #FB923C | Charts: secondary brand line                          |
| `brand-500` | #F97316 | Charts: primary brand line                            |
| `brand-600` | #EA580C | **CTA buttons.** Default primary action.              |
| `brand-700` | #B45309 | **The Acme Orange.** Logo star, large display fills.  |
| `brand-800` | #9A3412 | Hover state on `brand-700` surfaces                   |
| `brand-900` | #7C2D12 | Headers on cream, deep accents                        |
| `brand-950` | #431407 | Reserved — text-on-light only at large sizes          |

### 4.2 Accent ramp — mustard yellow

| Token        | Hex     | Use                                                  |
|--------------|---------|------------------------------------------------------|
| `accent-50`  | #FFFAEB | "Growth tier" badge background                       |
| `accent-200` | #FDE089 | Growth tier badge border                              |
| `accent-300` | #FEC84B | Strapline ink on dark surfaces, focus highlights      |
| `accent-500` | #F59E0B | **The Acme Mustard.** Strapline ink, premium accents |
| `accent-800` | #92400E | Growth tier text                                     |

Use the accent ramp sparingly — it competes with brand when over-applied. Reserve for the "Acme Premium" tier and small accents on dark backgrounds.

### 4.3 Paper

| Token          | Hex     | Use                                                  |
|----------------|---------|------------------------------------------------------|
| `paper-cream`  | #FAF7F0 | **Page background.** The cream that defines the brand.|
| `paper-warm`   | #F5EFE0 | Sidebar surfaces in admin shells                      |
| `paper-card`   | #FFFDF8 | Card surfaces — slight warmth, separates from cream   |
| `paper-ink`    | #1F1F1F | Body text, headlines, "stamp ink" effect              |
| `paper-rule`   | #E8E0CF | Hairline rules between sections                       |

Pair `paper-cream` (page) with `paper-card` (surfaces) — the slight warmth differential lifts cards without needing a shadow.

### 4.4 Tier colours

| Tier               | Background      | Text          | Border        | Notes                                |
|--------------------|-----------------|---------------|---------------|--------------------------------------|
| **Seed**           | `bg-brand-50`   | `brand-700`   | `brand-200`   | The default. Warm and welcoming.      |
| **Growth**         | `bg-accent-50`  | `accent-800`  | `accent-200`  | A step up — mustard signals progress. |
| **Acme Premium**   | `bg-paper-ink`  | `accent-300`  | `paper-ink`   | Charcoal + gold. Premium = exclusive. |

---

## 5. Typography

### 5.1 Type stack

- **Display / Headings:** IBM Plex Serif (500/600/700) — loaded via `next/font/google` as `--font-plex-serif`. Auto-applied to `h1`/`h2`/`h3` site-wide.
- **Body / UI:** Inter (400/500/600/700) — loaded as `--font-inter`. Default everywhere except headings.
- **Mono / Stamps:** IBM Plex Mono — used for strapline, the OG "CONFIDENTIAL" stamp, and any "catalog-code" style metadata.

### 5.2 Display scale

| Class                | Use case                                       |
|----------------------|------------------------------------------------|
| `text-display-2xl`   | OG-image hero copy only                        |
| `text-display-xl`    | Landing-page hero on `/login` (if added)       |
| `text-display-md`    | Portal & admin page H1 ("Welcome to Acme")     |
| `text-display-sm`    | Auth-panel tagline                             |
| `text-display-xs`    | Section subheaders, modal titles               |

### 5.3 Body scale

| Class      | Use case                                       |
|------------|------------------------------------------------|
| `text-lg`  | Lede paragraphs, marketing copy                |
| `text-md`  | Default body copy, forms, descriptions         |
| `text-sm`  | UI metadata, table cells, secondary info       |
| `text-xs`  | Legal footer, timestamps, audit metadata       |

### 5.4 Don'ts

- Don't use the serif for body copy — it's a display face, not a workhorse.
- Don't track-out the body face (Inter looks worst with positive letter-spacing).
- Don't mix the serif with system serif fallbacks — load IBM Plex Serif or accept the fallback chain (Roboto Slab → Georgia) entirely.

---

## 6. Iconography

The shipped React-icon set (lucide-style line icons at 1.5px stroke) is the default. Render them in `text-brand-600` on active surfaces and `text-quaternary` on inactive. Avoid using more than one filled icon style per page.

For brand moments — landing surfaces, empty states, the about page — we lean on **technical-drawing illustration**: exploded views with dimension callouts, the "EXHIBIT 14B" stamp aesthetic. Treat as photography; never recolour into the brand palette.

The team photos (Wile E. Coyote, Road Runner, Granny) are intentionally off-register cartoons in a 1950s catalogue style. They're the brand's single piece of warmth — keep them; don't replace with stock headshots.

---

## 7. Layout

### 7.1 Grid

- **Page max-width:** 1280px (`--max-width-container`).
- **Side gutters:** 24px mobile, 48px tablet, 80px desktop.
- **Vertical rhythm:** multiples of 8px. Hero blocks 48-80px tall. Body sections 32px tall.

### 7.2 Surfaces

- Page background: `paper-cream`
- Cards: `paper-card` with `border-paper-rule` (1px). No shadow on rest, subtle shadow (`shadow-xs`) on hover.
- Sidebar (portal): `bg-primary` (white) with a vertical hairline rule.
- Sidebar (admin): `bg-paper-warm` for visual distinction from the portal.
- Brand panels (auth hero, "Viewing as" banner): solid `brand-600`.

### 7.3 Density

Acme leans **generous over compact**. A data room is read carefully, not skimmed — spacing it loosely signals confidence in the content. Resist the urge to tighten line-heights or shrink card padding.

---

## 8. Brand applications

### 8.1 Login screen

Two-column split. Left (50%) is solid `brand-600` with the wordmark top-left in white, the hero sentence in the centre in IBM Plex Serif Display SM, and the © line at the bottom in `brand-300`. Right (50%) is `paper-cream` with the form floated in the centre. The Sign-in button is `brand-600` with `text-white`.

### 8.2 OG / social preview

The 1200×630 OG card (built from `.screenshots/og-template.html`, rendered with Playwright):
- Cream paper background with faint diagonal hatch pattern
- Top rule with `★ ACME CAPITAL` mark left, "EST. 1948 — INDUSTRIAL CATALOGUE" right
- Centre headline ("Anvils. Dynamite. / Rocket skates. / *At SaaS margins.*") with the italic line in `brand-700`
- Bottom row: "INVESTOR DATA ROOM · BY INVITATION ONLY" mono left, a slightly-rotated "CONFIDENTIAL" stamp right

Refresh after any logo change via `node .screenshots/render-og.mjs`.

### 8.3 Email templates

- From-name: "Acme Capital Investor Portal"
- Subject pattern (invite): `Acme Capital: an invitation to peruse our catalog`
- Subject pattern (reset): `Reset your Acme Capital portal password`
- Sub-footer: "Acme Capital · Industrial Solutions Since 1949"
- Email logo: CID-inlined PNG render of the SVG at 240×112 @2x

### 8.4 Chatbot

- Header title: "Ask the Acme catalog"
- Subtitle: "I've read every catalog since 1949."
- Greeting: "Welcome. I'm the Acme catalog assistant. I've read everything in this data room and I am professionally obligated to refer to our products with a straight face."
- Error message: "Something went wrong. Most likely an anvil fell on the server. Try again?"
- Empty knowledge: "The catalog hasn't been indexed yet. Ask the admin to run an ingest. While you wait, please consider the Acme Hyperbolic Spring Loaded Mallet (Section 14B)."

The voice is part of the brand. Edit chat strings only with care — every line is also a copy sample.

### 8.5 Tier badges

Use the colours from §4.4. Render at `text-xs` weight 500, padding `px-2.5 py-0.5`, rounded-full, on the admin invite form, portal sidebar (if tier is shown), and chat-source-attribution chips.

---

## 9. Don'ts (the short list)

- Don't put the sticky-note cartoon "ACME CAPITAL" PNG anywhere. It was a pre-generation joke asset; the SVG wordmark is the real mark now.
- Don't change `tagline` from a sentence — the templates were updated to accept it; reverting to a noun phrase ("Investor data room") makes the brand feel timid.
- Don't introduce a third type face. Plex Serif + Inter + Plex Mono is the complete system.
- Don't use red anywhere except for `error-*` semantics. The brand uses orange and mustard for emphasis; red competes.
- Don't add dark mode without picking dark-mode variants of every paper-* and brand-* token. The cream-paper-on-light story is half the brand.

---

## 10. File reference

| Asset                                  | Path                                                     |
|----------------------------------------|----------------------------------------------------------|
| Primary logo (light surfaces)          | `public/assets/branding/logo-light.svg`                  |
| Primary logo (dark surfaces)           | `public/assets/branding/logo-dark.svg`                   |
| Favicon (SVG, modern browsers)         | `public/assets/branding/favicon.svg`                     |
| Favicon (PNG fallback, legacy)         | `public/assets/branding/favicon.png`                     |
| OG / social preview (1200×630)         | `public/assets/branding/og.png`                          |
| OG source HTML                         | `.screenshots/og-template.html`                          |
| OG render script (Playwright)          | `.screenshots/render-og.mjs`                             |
| Email logo (CID-inlined PNG)           | `public/assets/branding/email-logo.png`                  |
| Team portraits                         | `public/assets/team/{wile-e-coyote,road-runner,granny}.png` |
| Colour tokens (Tailwind v4)            | `src/styles/theme-brand.css`                             |
| Display + body type wiring             | `src/app/layout.tsx`, `src/styles/theme.css`             |
| Heading auto-serif rule                | `src/styles/globals.css`                                 |

---

## 11. Refreshing the brand

To re-skin the entire app (e.g., a different example like Greenwood Holdings), edit only:

1. **`src/styles/theme-brand.css`** — swap the brand and accent ramps. The whole UI re-colours on save.
2. **`dataroom.config.ts`** — point `assets.*` at new files, swap `brand.name` + `brand.tagline`, override `access.tiers[].colour` if needed.
3. **`public/assets/branding/`** — drop in the new SVGs.

No component edits required. The brand layer is a single token surface plus a config file plus six asset files. Everything downstream picks it up on the next render.
