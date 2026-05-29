# Rebrand workflow

The shipped repo is the Acme Capital sample brand. To make it your own you have two paths:

1. **AI-driven rebrand** (recommended, ~10 minutes) — paste the prompt below into Claude Code, Cursor, or any agentic AI tool that can read and write files in this repo.
2. **Manual rebrand** (~1–2 hours) — work down the file list yourself, using `examples/acme-capital/BRAND.md` as a model for what to produce.

This document covers path (1). For path (2), open the file list in the table at the bottom and edit each in turn.

---

## What "fully rebranded" means

A complete rebrand touches **six surfaces**. The Acme example covers all six, so you can use it as your reference:

| Surface                 | File(s)                                                                                | What changes                                                              |
|------------------------|-----------------------------------------------------------------------------------------|---------------------------------------------------------------------------|
| Config                 | `dataroom.config.ts`                                                                    | brand name/tagline, theme primary/accent, tier names + colours, team bios, chatbot persona + starters, email subjects, document categories + weights, localKnowledge paths |
| Colour palette         | `src/styles/theme-brand.css`                                                            | the 12-step brand ramp + 9-step accent ramp + paper tokens                |
| Logo + favicon         | `public/assets/branding/{logo-light,logo-dark,favicon}.svg`                             | hand-written SVG (typographic mark is usually the right call)             |
| OG / social preview    | `.screenshots/og-template.html` + `og.png` (rendered via `.screenshots/render-og.mjs`)  | HTML template re-rendered to 1200×630 PNG via Playwright                  |
| Team photos            | `public/assets/team/*.png`                                                              | new portraits (or none — set `team.enabled = false` to hide the page)    |
| Local-knowledge        | `content/*.md`                                                                          | replace the Acme catalog-disclaimer with your founder letters / memos     |
| Brand guidelines       | `BRAND.md` (project root, or `examples/<your-slug>/BRAND.md` if you ship the new brand as an example) | a real document describing voice, palette, type, logo, applications, don'ts |

---

## The AI rebrand prompt

Copy everything between the `---` lines below into your AI agent. Fill in the `[FILL IN]` blocks with what you know about your company. The more you give the agent, the better the result — at minimum it needs a company name, a one-line description, and a brand colour.

---

```
I want to rebrand this open-dataroom template from "Acme Capital" to my company.

# About my company
- **Name:** [FILL IN — e.g. "Northstar AI"]
- **One-line description:** [FILL IN — what you do, in one sentence]
- **Stage:** [FILL IN — pre-seed / seed / Series A / etc.]
- **Audience for the data room:** [FILL IN — angels / VCs / corporate strategics / LPs]
- **Voice / tone:** [FILL IN — choose ~3 adjectives, e.g. "confident, technical, slightly playful"]
- **What you DON'T want to sound like:** [FILL IN — optional; e.g. "no startup buzzwords, no growth-hacking energy"]

# Brand visual direction
- **Primary colour:** [FILL IN — a hex value, e.g. #1E3A5F. If you don't have one, pick one in keeping with the voice above and tell me what you chose.]
- **Accent colour (optional):** [FILL IN — or derive from primary]
- **Vibe:** [FILL IN — e.g. "modern indie SaaS", "Penguin Classics paperback", "mid-century industrial catalogue", "Stripe-clean", or any reference you'd give to a designer]
- **Type direction:** [FILL IN — "all sans (Inter)", "display serif + sans body", "all serif", or leave blank and recommend]

# Founders / team
[FILL IN — for each founder: name, role, 1-sentence bio. The team page is optional; if you don't want one, say "skip team page" and the agent will set team.enabled = false.]

# What to actually do

Use `examples/acme-capital/BRAND.md` as your reference for what a complete brand kit looks like. Then:

1. Plan the brand: palette derivation (12-step ramp + accent ramp + paper tokens), type stack, logo concept, tier names + colour assignments, persona + voice.
2. Make the edits:
   - Edit `dataroom.config.ts` end-to-end (brand, theme, ai stays, email, access.tiers, documents, team, chatbot.persona + starter questions, localKnowledge if I'm shipping markdown content).
   - Rewrite `src/styles/theme-brand.css` with the new ramp (preserve the `@theme {}` wrapper — without it Tailwind won't generate utility classes).
   - Hand-write `public/assets/branding/{logo-light,logo-dark,favicon}.svg` — typographic SVG marks scale better than raster.
   - Edit `.screenshots/og-template.html` to match the new brand, then run `node .screenshots/render-og.mjs` (or `render-og-all.mjs`) to regenerate `og.png`.
   - If team is enabled and I have photos, drop them in `public/assets/team/` and reference them in `dataroom.config.ts` team.members. If I don't have photos, set `team.enabled = false`.
   - Replace `content/*.md` with my actual founder content (or delete them if I prefer Drive-only).
3. Write a new `BRAND.md` at the repo root following the structure of `examples/acme-capital/BRAND.md` — 11 sections: voice & tone table, logo system + clear space + don'ts, full colour ramps with hex + use cases, type stack + scale, iconography, layout, brand applications, don'ts, file ref, "how to refresh".
4. Verify by running `npm run dev` and screenshotting via `node .screenshots/tour.mjs`. Compare against the previous Acme screenshots.
5. Tell me what you changed and what I should review.

# Constraints
- Don't touch anything under `src/lib/`, `src/app/`, or `bin/` unless a brand change requires it (e.g. a per-page font-family override). The template UI is already polished for any brand kit — just feed it the right tokens.
- Don't change `dataroom.config.ts`'s `ai.chatProvider` / `ai.embeddingsProvider` unless I ask. Those are operational, not brand.
- Don't change `dataroom.config.ts`'s `technical` section.
- Keep the existing import path: `from "./src/lib/config-types"`.
- If you generate logos by hand-writing SVG, prefer typographic marks (wordmark with letterspacing + small ornament) over generative shapes.
- Confirm with me before deleting any file.
```

---

## How to feed extra context to the agent

If you have more material, drop it in alongside the prompt:

- **A pitch deck or one-pager** → "Here's our pitch deck text, derive the persona and starter questions from this:" + paste content
- **An existing logo you want to recreate as SVG** → "Match this visual style:" + describe / link
- **A brand guidelines doc you already have** → "Use this as my source of truth:" + paste it
- **Examples of brands you admire** → "Visual direction should feel like [Linear / Notion / Stripe / Carta / a specific company's data room]"

The agent will use whatever you give it. Verbose context produces better rebrand quality — there's no penalty for over-sharing.

---

## After the rebrand

1. **Visual check.** Run `npm run dev`, then `node .screenshots/tour.mjs` to capture login + portal + admin. Compare with the Acme screenshots to see what changed.
2. **Lint check.** `npm run check` should still pass (it tests connections, not visuals).
3. **Build check.** `npm run build` should still compile clean — the brand layer is decoupled from the rendering layer.
4. **Commit.** A clean rebrand should land in 2–4 commits:
   - `chore(brand): rewrite dataroom.config.ts + theme-brand.css for [Company]`
   - `chore(brand): new SVG logo + favicon + OG render`
   - `chore(brand): team + content updates`
   - `docs(brand): BRAND.md for [Company]`

---

## Iterating

The first AI pass usually gets you 80% there. To refine:

- "The login page brand panel looks too dark — try a lighter primary"
- "The chatbot persona is too formal — add more humour"
- "The logo wordmark is too tight — increase letter-spacing"
- "The OG image needs a stronger headline"

Each is a small, local change the agent can do in one pass without re-touching the whole brand.

---

## If the AI agent doesn't have file-edit tools

Some chat interfaces (the plain Claude.ai web app, for instance) can't edit your files directly. In that case, paste the prompt anyway and ask for the **output as a series of unified diffs you can apply yourself with `git apply`**. Slower but workable.

Or use the manual rebrand path — open each file in the table at the top and edit one at a time, using `examples/acme-capital/BRAND.md` as your reference for what a complete brand looks like.
