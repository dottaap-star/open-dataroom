# Lighthouse Labs — Brand Guidelines

> A one-founder, one-product, one-conviction indie startup raising a small pre-seed. The data room is a fictitious investor portal where the founder is honest about everything — the rough edges, the "mostly vibes" financials, the fact that the chatbot is technically the only other employee. Use this document when extending the Lighthouse example.

**Version 1.0** · maintained alongside the `examples/lighthouse-labs/` dataset.

---

## 1. The brand in one paragraph

Lighthouse Labs is one engineer (Yuna), one product (a dev tool with eight paying customers), and one conviction (small, devoted, profitable). The brand is deep indigo navy with warm amber highlights — modern indie SaaS, not aged paper. The voice is earnest, hilariously self-aware, and occasionally apologetic. Where Acme is rigorous-with-a-straight-face and Greenwood is restrained-and-poetic, Lighthouse is honest-and-self-aware. The visual identity is clean and digital — Inter throughout, no display serifs, generous whitespace, the brand-mark is a single tiny lighthouse glyph. It looks like a product, not a fund. The amber accent is the beam of the lighthouse: rare, intentional, drawing the eye to one thing at a time.

## 2. Voice & tone

| Trait              | Do                                                                       | Don't                                                                |
|--------------------|--------------------------------------------------------------------------|----------------------------------------------------------------------|
| **Register**       | Earnest, conversational, sometimes self-deprecating                       | Corporate, polished, hedged                                          |
| **Honesty**        | Admit what's rough — "the financials are mostly vibes; the conviction is real" | Inflate, soften, or hide the early-stage texture                  |
| **Pronouns**       | First person singular when appropriate. "I built this in three weeks."   | Royal we / corporate we                                              |
| **Capitalisation** | Sentence case for most UI. lowercase for casual moments.                  | TITLE CASE FOR EMPHASIS                                              |
| **Apologies**      | When something doesn't work, say sorry plainly                            | "We apologise for any inconvenience this may cause"                  |
| **Numbers**        | Specific. "Eight paying customers." "$1M @ $10M post."                    | "Strong early traction"                                              |
| **Vibes**          | The word "vibes" is allowed when nothing else fits.                       | But not in every sentence.                                            |

**Hero sentence** (auth panel, OG card, pitch deck cover):

> 1 founder. 1 product. 1 conviction.

**Tagline alternates** (rotation OK):
- A single product, shipped late at night.
- Small on purpose.
- The financials are vibes. The conviction is real.

**Forbidden words:** *"enterprise"*, *"solutions"*, *"platform"*, *"holistic"*, *"world-class"*. Lighthouse is small. Stay small.

---

## 3. Logo system

### 3.1 Primary mark

A simple lighthouse-tower glyph + the wordmark "Lighthouse Labs" in Inter Bold with tight negative tracking. Strapline below in Inter Medium: `A single product, shipped late at night.`

- **Tower glyph** in `--color-paper-ink` on light surfaces, cream on dark. Three rectangles + triangle cap, with an amber `--color-accent-400` (#FBBF24) **beam** triangle to the right.
- **Wordmark** "Lighthouse Labs" in Inter Bold, -2.5% letter-spacing, in `--color-paper-ink`.
- **Strapline** in Inter Medium, +4% letter-spacing, muted in `#5B6BA0`.

File: `public/assets/branding/logo-light.svg` (320×80 viewBox). The `logo-dark.svg` inverts everything to cream-on-navy.

### 3.2 Favicon

The lighthouse tower glyph in cream on a deep-navy rounded square, with an amber dot at lantern height (the beam, simplified). 64×64 SVG.

### 3.3 The beam

The amber beam triangle is the brand's single piece of warmth. Use it ONCE per surface. Don't repeat it as a pattern, don't tile it, don't add multiple beams.

### 3.4 Clear space

Minimum clear space = the width of the tower glyph. Never put copy or imagery within the beam triangle.

---

## 4. Colour

### 4.1 Brand ramp — deep indigo navy

| Token       | Hex     | Use                                                  |
|-------------|---------|------------------------------------------------------|
| `brand-25`  | #F9FAFD | Wash backgrounds                                     |
| `brand-50`  | #EEF2FB | Nav active state, badge wash                          |
| `brand-100` | #D8E2F7 | Hover state on brand wash                             |
| `brand-200` | #B4C6F0 | Border on brand wash badges                           |
| `brand-300` | #8CA7E2 | Focus-ring stop                                       |
| `brand-400` | #6382CF | Charts: secondary brand line                          |
| `brand-500` | #4060B2 | Charts: primary brand line                            |
| `brand-600` | #2C4A98 | **CTA buttons.** Default primary action.              |
| `brand-700` | #1E3A8A | **The Lighthouse Navy.** Logo wordmark, large fills.  |
| `brand-800` | #182C66 | Hover state on `brand-700` surfaces                   |
| `brand-900` | #11204D | Headers on light backgrounds                          |
| `brand-950` | #0B1534 | Reserved — deepest accents                            |

### 4.2 Accent ramp — warm amber

| Token        | Hex     | Use                                                  |
|--------------|---------|------------------------------------------------------|
| `accent-200` | #FDE075 | Highlight wash on quotes / pull-quotes               |
| `accent-300` | #FCD144 | Pull-quote underline, focus highlight                |
| `accent-400` | #FBBF24 | **The Lighthouse Amber.** The beam. Used sparingly.  |
| `accent-700` | #92640B | Strapline ink, amber-on-light text                   |

The amber is **deliberately scarce**. Reserve for: the beam in the logo, one accent per landing surface (e.g., the underline on the pull-quote), and the "v1" tag on the OG card. Never use as a CTA fill — it competes with the navy.

### 4.3 Paper

| Token          | Hex     | Use                                                  |
|----------------|---------|------------------------------------------------------|
| `paper-cream`  | #FAFAFC | **Page background.** Near-white digital, not paper.   |
| `paper-warm`   | #F4F4F8 | Sidebar surfaces in admin                             |
| `paper-card`   | #FFFFFF | Card surfaces — pure white                            |
| `paper-ink`    | #111118 | Body text — near-black                                |
| `paper-rule`   | #E4E4EC | Hairline rules                                        |

Lighthouse's "cream" is barely off-white. Where Acme and Greenwood lean into warm paper, Lighthouse leans into digital surfaces. Pure white cards on near-white backgrounds — a single hair of contrast.

### 4.4 Tier colours

Lighthouse ships **no tiers** (`config.access.tiers = []`). All signed-in users see all documents. If a fork adds tiers (e.g., "early access" vs "general"), use the brand wash for the default tier and the amber wash for a one-step-up tier. Don't add a charcoal-with-gold premium tier — Lighthouse doesn't have a luxury register.

---

## 5. Typography

### 5.1 Type stack

- **Display + Body + UI:** Inter (400/500/600/700/800) — loaded once via `next/font/google`. No display serif.
- **Mono:** the system mono fallback chain. Used only for the OG metadata, cap-table tables, and any code-like content.

Inter does the whole job. The brand's restraint is partly typographic: one face, varied weights, tight tracking on display sizes.

### 5.2 Display scale

Lighthouse uses **tight negative tracking** on display sizes — Inter looks sharpest there.

| Class                | Use case                                       | Tracking |
|----------------------|------------------------------------------------|----------|
| `text-display-2xl`   | OG hero ("1 founder. 1 product. 1 conviction.") | -0.025em |
| `text-display-md`    | Portal & admin page H1                          | -0.02em  |
| `text-display-xs`    | Section subheaders                              | -0.015em |

### 5.3 Don'ts

- Don't introduce a display serif. The whole brand argument is "Inter throughout."
- Don't reach for ALL CAPS for emphasis. Use weight (600 → 700) instead.
- Don't add a third font. Two would be one too many.

---

## 6. Iconography

The shipped line-icon set is used unmodified — Lighthouse doesn't need brand-specific iconography. Render in `text-brand-700` on active surfaces, `text-tertiary` on inactive. Don't fill icons; outline only matches the brand's lightness.

There is **no team photography** — the team page is disabled (`config.team.enabled = false`). The single founder bio lives in `content/about-the-founder.md` as plain prose.

---

## 7. Layout

### 7.1 Grid

- **Page max-width:** 1280px (template default)
- **Side gutters:** 24 / 48 / 64 px

### 7.2 Surfaces

- Page background: `paper-cream` (near-white)
- Cards: `paper-card` (pure white) with `paper-rule` border (1px). Subtle shadow on hover, none at rest.
- Sidebar (portal): pure white with hairline rule. No tint.
- Sidebar (admin): `paper-warm` (very subtly tinted) — barely-visible differentiation.
- Auth brand panel: gradient from `brand-700` at top to `brand-900` at bottom, with a soft amber radial-gradient overlay (the beam, abstracted).

### 7.3 Density

Lighthouse is **the most generous** of the three brands — solo founder, careful product, generous whitespace. Card padding 32-40px. Section gaps 80-96px.

---

## 8. Brand applications

### 8.1 Login screen

Two-column split. Left (50%) is the gradient brand panel with the logo top-left and "1 founder. / 1 product. / 1 conviction." in tight Inter Display Black at 64px, plus a soft amber radial highlighting the upper-left corner. Right (50%) is `paper-cream` with the form.

### 8.2 OG / social preview

The 1200×630 OG card ([.screenshots/og-lighthouse.html](../../.screenshots/og-lighthouse.html)) is a two-column split-screen:
- Left: deep-navy gradient with soft amber-beam radial overlay, the tower-glyph + wordmark top-left, and the giant "1 founder. / 1 product. / 1 conviction." Inter Display Black.
- Right: pure white "The Ask" panel — pitch headline ("A small round to remove a constraint, not chase a bigger story.") in Inter Semibold, then a four-row metadata block: Stage, Raise, Use, Closing.

Refresh after any logo change via `node .screenshots/render-og-all.mjs`.

### 8.3 Email templates

- From-name: "Yuna at Lighthouse"
- Subject (invite): `Come look at Lighthouse Labs`
- Subject (reset): `Reset your Lighthouse Labs password`
- Sub-footer: null (intentional — single-founder brand doesn't need a separate sub-footer line)
- Email body should sound like a personal email from Yuna, not a transactional notification.

### 8.4 Chatbot

- Header title: "Ask Lighthouse"
- Subtitle: "I'm one person and one bot. Hi."
- Greeting: "Hey. I'm the Lighthouse assistant. I am, technically, the only employee, and yes that includes me, the bot. Ask me anything."
- Error: "Sorry, something glitched. I'm one person — I'll fix it tonight."
- Empty knowledge: "There's nothing indexed yet. The admin (also me, the founder, also me, the bot) needs to run the indexer."

The platform-attribution easter egg is **suppressed** (`chatbot.suppressPlatformAttribution = true`) — Lighthouse doesn't volunteer "I'm running on open-dataroom"; the brand is the founder, not the framework.

### 8.5 Footer

`poweredByCredit = false` — Lighthouse hides the open-dataroom attribution. This is the example that demonstrates the opt-out path; forks doing white-label work follow this pattern.

---

## 9. Don'ts (the short list)

- Don't add display serifs. Inter throughout.
- Don't make the amber a primary action colour. It's the beam.
- Don't enable a luxury "premium" tier — Lighthouse's whole story is that small is the point.
- Don't switch from sentence case to title case anywhere except buttons.
- Don't add the `Powered by` footer. The example removes it deliberately.
- Don't make Yuna a brand character. Yuna is a person; the brand is the product.

---

## 10. File reference

| Asset                                  | Path                                                     |
|----------------------------------------|----------------------------------------------------------|
| Primary logo (light surfaces)          | `public/assets/branding/logo-light.svg`                  |
| Primary logo (dark surfaces)           | `public/assets/branding/logo-dark.svg`                   |
| Favicon (SVG)                          | `public/assets/branding/favicon.svg`                     |
| Favicon (PNG fallback)                 | `public/assets/branding/favicon.png`                     |
| OG / social preview (1200×630)         | `public/assets/branding/og.png`                          |
| OG source HTML                         | `.screenshots/og-lighthouse.html`                        |
| OG render script (all three brands)    | `.screenshots/render-og-all.mjs`                         |
| Email logo                             | `public/assets/branding/email-logo.png`                  |
| Local-knowledge markdown (6 files)     | `content/{the-idea,the-demo,how-far-ive-gotten,the-cap-table,the-ask,about-the-founder}.md` |
| Colour ramp (Tailwind v4 tokens)       | `examples/lighthouse-labs/theme-brand.css`               |
| Active site theme (after swap)         | `src/styles/theme-brand.css`                             |

---

## 11. Applying the brand

```bash
npm run example:lighthouse-labs
```

Swaps in: `dataroom.config.ts`, `src/styles/theme-brand.css`, `content/` (6 markdown files), `public/assets/branding/`. Skips `public/assets/team/` (no team).

To customise further:

1. **Colours:** edit `src/styles/theme-brand.css` post-swap. The whole UI re-skins on save.
2. **Type:** Inter is already the body face by default — the heading auto-serif rule in `globals.css` would force Garamond/Plex Serif on `h1`/`h2`/`h3`. For Lighthouse to look right, you'd either remove that rule (template-wide impact) OR override per-page with `font-sans` on heading classes. Recommended: per-page override; don't break the default for other examples.
3. **Voice:** preserve the self-aware, occasionally lowercase register. The chatbot copy is half the brand — edit it with the same care as the visuals.
