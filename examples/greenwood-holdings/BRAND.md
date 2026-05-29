# Greenwood Holdings — Brand Guidelines

> A boutique family-office investment fund, rendered with the seriousness of a Penguin Classics paperback. The data room is a fictitious LP letterhead for a Wes-Anderson-ish small fund — heritage assets, properties of consequence, the occasional thing in oak. Use this document when extending the Greenwood example.

**Version 1.0** · maintained alongside the `examples/greenwood-holdings/` dataset.

---

## 1. The brand in one paragraph

Greenwood Holdings is a fund of two siblings and one parrot, founded sometime in the mid-1990s in a townhouse with very symmetrical windows. The brand is dusty navy ink on blush-cream paper, italic Garamond display type set centered between brass rules, and language that reads like a polite footnote in a clothbound book. The voice is measured, slightly poetic, and mildly suspicious of anything modern. The visual identity says "this is a serious operation, but a small one" — the smallness is not a weakness, it is the point. Symmetry, restraint, gilt edges. Never breathless.

## 2. Voice & tone

| Trait              | Do                                                                       | Don't                                                                |
|--------------------|--------------------------------------------------------------------------|----------------------------------------------------------------------|
| **Register**       | Measured, slightly poetic — write like an LP letter                      | Casual, breathless, or padded with growth-marketing copy             |
| **Pace**           | Slow. Allow a thought to land before moving on.                          | Energetic. Greenwood is not in a hurry.                              |
| **Citations**      | Footnoted: "(Q1 letter, §3)"; "as set down in the Property Memo"         | "BTW", "FYI", "to be clear"                                          |
| **Numbers**        | Spell out small numbers, present large ones in full ("one million pounds") | Round, dramatic ("£1M!", "10x growth")                              |
| **Modernity**      | Treated as a phenomenon to be discussed, not embraced                    | Praised by default                                                  |
| **Ferdinand**      | Reference Margot's parrot when context allows — never gratuitously       | Make Ferdinand the whole bit                                         |
| **Bad news**       | Delivered plainly, with the polite finality of a butler                  | Hedged with corporate softening ("at this time we are unable to…")  |

**Hero sentence** (auth panel, OG image, fund deck cover):

> An exceedingly small fund.

**Tagline alternates** (rotation OK):
- Heritage assets, conducted in the symmetry they deserve.
- The occasional thing in oak.
- Diligence as we believe it should be conducted.

**Forbidden words:** *"crushing it"*, *"unicorn"*, *"hypergrowth"*, *"founder-led"*, *"product-market fit"*, *"flywheel"*, anything that would not pass for prose in a 1965 estate-management bulletin.

---

## 3. Logo system

### 3.1 Primary mark

A centred italic Garamond wordmark, "Greenwood Holdings," flanked by thin brass rules and tiny fleuron ornaments. Strapline below in spaced Garamond Roman caps: `EST. MMXVI · HERITAGE INVESTMENTS`.

- **Wordmark** in EB Garamond Semibold Italic, navy `--color-brand-700` (#1E3A5F).
- **Brass rules + fleurons** in `--color-accent-400` (#C9A96E), 0.8px stroke.
- **Strapline** in EB Garamond Regular, +18% letter-spacing, all-caps, warm-muted `#5C4623`.

File: `public/assets/branding/logo-light.svg` (360×80 viewBox). On dark surfaces use `logo-dark.svg` — wordmark becomes cream, ornaments stay brass.

### 3.2 Favicon

Italic Garamond **G** in cream knockout on a deep-navy rounded square, with a thin brass underline. 64×64 SVG.

### 3.3 Symmetry

The composition is always centred. Never left-align Greenwood's logo on a landing surface; never lay the wordmark on top of imagery without a centre-anchored frame around it.

### 3.4 Clear space

Minimum clear space equals the strapline height on all sides. Never crop the brass rules. Never use the wordmark without the rules (they are part of the mark, not decoration).

---

## 4. Colour

### 4.1 Brand ramp — dusty navy

| Token       | Hex     | Use                                                  |
|-------------|---------|------------------------------------------------------|
| `brand-25`  | #F7FAFD | Wash backgrounds                                     |
| `brand-50`  | #EEF4FB | Nav active state, LP tier badge wash                  |
| `brand-100` | #D6E4F4 | Hover state on brand wash                             |
| `brand-200` | #B8CFE8 | Border on brand wash badges                           |
| `brand-300` | #8FB2D5 | Focus-ring stop                                       |
| `brand-400` | #638EBD | Charts: secondary brand line                          |
| `brand-500` | #3C699F | Charts: primary brand line                            |
| `brand-600` | #295082 | **CTA buttons.** Default primary action.              |
| `brand-700` | #1E3A5F | **The Greenwood Navy.** Logo wordmark, large fills.   |
| `brand-800` | #162B48 | Hover state on `brand-700` surfaces                   |
| `brand-900` | #0F1E34 | Headers on cream, deep accents                        |
| `brand-950` | #091220 | Reserved — text-on-light only at large sizes          |

### 4.2 Accent ramp — brass

| Token        | Hex     | Use                                                  |
|--------------|---------|------------------------------------------------------|
| `accent-100` | #F0E5C8 | Letterhead wash backgrounds                          |
| `accent-200` | #E4D3A1 | Brass-rule decorative borders                         |
| `accent-400` | #C9A96E | **The Greenwood Brass.** Logo rules, OG ornaments.   |
| `accent-700` | #7A5D30 | Strapline ink, footnoted text                         |

Brass is decorative, not interactive. Never use it as a CTA fill. Reserve for ornaments, rules, and footnote ink.

### 4.3 Paper

| Token          | Hex     | Use                                                  |
|----------------|---------|------------------------------------------------------|
| `paper-cream`  | #F4ECE2 | **Page background.** Blush-warm, slightly pink.       |
| `paper-warm`   | #EDE2D3 | Sidebar surfaces in admin                             |
| `paper-card`   | #FCF8F0 | Card surfaces                                         |
| `paper-ink`    | #151F2E | Body text — near-navy, not full black                 |
| `paper-rule`   | #DCCFBC | Hairline rules                                        |

The blush warmth in `paper-cream` is what distinguishes Greenwood's surface from Acme's. Don't desaturate to pure-cream; the slight pink is intentional.

### 4.4 Tier colours

Greenwood ships a single tier (LP). The badge uses the brand wash + brand-700 text + brand-200 border. Forks adding tiers should keep the pattern (`brand-50` for the default, `accent-50` + `accent-700` for a "Heritage Partner" upgrade, `paper-ink` + `accent-300` for a "Private" top tier).

---

## 5. Typography

### 5.1 Type stack

- **Display / Headings:** EB Garamond Italic (600/700) — loaded via `next/font/google` once added to `src/app/layout.tsx`. The italic is essential; Roman EB Garamond is too plain for the brand. Auto-applied to `h1`/`h2`/`h3` site-wide.
- **Body / UI:** Inter (400/500/600/700) — kept from the template default.
- **Footnote / Strapline:** EB Garamond Regular with +18% letter-spacing, all-caps. Used only on the OG card, the logo strapline, and section labels.

### 5.2 Display scale

Greenwood favours larger leading and looser tracking than Acme. The reader should feel they have time.

| Class                | Use case                                       |
|----------------------|------------------------------------------------|
| `text-display-2xl`   | OG-image hero copy ("An exceedingly / small fund") |
| `text-display-md`    | Portal & admin page H1                          |
| `text-display-xs`    | Section subheaders, modal titles                |

### 5.3 Don'ts

- Don't substitute Garamond for the body face — it's a display face only.
- Don't track-out Inter (it looks worst with positive tracking).
- Don't use the Roman EB Garamond — the italic is part of the brand mark.

---

## 6. Iconography & illustration

The shipped line-icon set is used sparingly — render in `text-brand-700` on active surfaces, `text-tertiary` on inactive. Greenwood does NOT use the more decorative illustration vocabulary that Acme does; brand moments lean on **typographic ornament** (fleurons, brass rules, page-number-style metadata) rather than illustration.

The two team photos (Hartwell and Margot, in their 1990s study portraits) are deliberately formal. Keep them; don't replace with stock photography.

---

## 7. Layout

### 7.1 Symmetry

Greenwood's layouts are **centred by default**. Hero copy, the auth panel headline, OG card composition — all centre-anchored. Resist the urge to left-align hero blocks.

### 7.2 Grid

- **Page max-width:** 1180px (slightly narrower than the template default — encourages reading rhythm)
- **Side gutters:** 24 / 48 / 96 px

### 7.3 Surfaces

- Page background: `paper-cream`
- Cards: `paper-card` with `paper-rule` border (1px). Slight inner shadow for depth.
- Sidebar (portal): cream with a brass-coloured rule between sections.
- Sidebar (admin): `paper-warm`, slightly darker to differentiate from the portal.
- Auth brand panel: solid `brand-700` (deeper than Acme's `brand-600`) — Greenwood prefers depth over brightness.

### 7.4 Density

Greenwood is **even more generous** than Acme. The reader is expected to settle in. Card padding 28-32px, section gaps 64-80px on desktop.

---

## 8. Brand applications

### 8.1 Login screen

Two-column split. Left (50%) is solid `brand-700` (deeper navy) with the wordmark centred at the top, the hero "An exceedingly small fund." centred in EB Garamond Italic Display, and the © line centred at the bottom in `brand-300`. Right (50%) is `paper-cream` with the form floated centre, also centre-anchored.

### 8.2 OG / social preview

The 1200×630 OG card ([.screenshots/og-greenwood.html](../../.screenshots/og-greenwood.html)) is a Penguin-Classics paperback cover treatment:
- Cream background with a double brass-rule inner border
- Top row: "Penguin Edition · Greenwood Holdings · Volume I" in spaced Roman caps
- "— Volume I —" colophon mark
- Centre headline ("An exceedingly / small fund.") in EB Garamond Italic at 96px navy
- Subtitle lede in two centred lines
- Bottom row: footer metadata + the italic confidential note in brass

Refresh after any logo change via `node .screenshots/render-og-all.mjs`.

### 8.3 Email templates

- From-name: "Greenwood Holdings Office"
- Subject (invite): `An invitation to the Greenwood Holdings data room`
- Subject (reset): `Reset the password to your Greenwood Holdings portal`
- Sub-footer: "Greenwood Holdings · A boutique family office"
- The body of every transactional email should read as if it had been dictated. Avoid bullet lists; use paragraphs.

### 8.4 Chatbot

- Header title: "The Greenwood archive"
- Subtitle: "Footnotes on request."
- Greeting: "Welcome to the Greenwood archive. I'm afraid I take questions only in writing. How may I be of service?"
- Error: "An error has occurred. We apologise for the inconvenience. Please attempt your enquiry again at your earliest convenience."
- Empty knowledge: "The archive has not yet been catalogued. The Office regrets the delay."

When citing sources, format them like footnotes: `¹ The Greenwood Charter, §3` rather than `[1]`. (Not yet rendered in the template — see Phase 9 follow-ups.)

### 8.5 Tier badge

Single tier ("LP") rendered in `bg-brand-50 text-brand-700 border-brand-200`. No second tier is shipped; a fork that adds tiers should preserve the restrained, centered presentation.

---

## 9. Don'ts (the short list)

- Don't use the cartoon "Greenwood" sticky-note PNG anywhere. The SVG wordmark is the real mark.
- Don't switch the display face from italic Garamond. The italic is the brand.
- Don't break centre-alignment on hero surfaces.
- Don't make Ferdinand a recurring joke. He is occasional.
- Don't use brass as a button fill. It's an ornament colour, not an interactive one.
- Don't add dark mode without explicit navy-on-cream-and-cream-on-navy variants. The cream paper is half the brand.

---

## 10. File reference

| Asset                                  | Path                                                     |
|----------------------------------------|----------------------------------------------------------|
| Primary logo (light surfaces)          | `public/assets/branding/logo-light.svg`                  |
| Primary logo (dark surfaces)           | `public/assets/branding/logo-dark.svg`                   |
| Favicon (SVG)                          | `public/assets/branding/favicon.svg`                     |
| Favicon (PNG fallback)                 | `public/assets/branding/favicon.png`                     |
| OG / social preview (1200×630)         | `public/assets/branding/og.png`                          |
| OG source HTML                         | `.screenshots/og-greenwood.html`                         |
| OG render script (all three brands)    | `.screenshots/render-og-all.mjs`                         |
| Email logo                             | `public/assets/branding/email-logo.png`                  |
| Team portraits                         | `public/assets/team/{hartwell,margot}.png`               |
| Colour ramp (Tailwind v4 tokens)       | `examples/greenwood-holdings/theme-brand.css`            |
| Active site theme (after `npm run example:greenwood-holdings`) | `src/styles/theme-brand.css`     |

---

## 11. Applying the brand

```bash
npm run example:greenwood-holdings
```

Swaps in: `dataroom.config.ts`, `src/styles/theme-brand.css` (new in this swap — colours change too), `content/`, `public/assets/branding/`, `public/assets/team/`.

To customise further:

1. **Colours:** edit `src/styles/theme-brand.css` after the swap. The whole UI re-skins on save.
2. **Type:** EB Garamond is not yet auto-loaded in `src/app/layout.tsx` — add `next/font/google` import + a `var(--font-eb-garamond)` mapping if you want the brand display face to render. The current shipped CSS falls back to the system serif chain (Georgia → Times) — workable but not ideal.
3. **Symmetry:** if you build new pages, centre-anchor the hero blocks; this is not optional for the brand.
