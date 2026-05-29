# open-dataroom

[![Built by Grona](https://img.shields.io/badge/built_by-Grona-054B3A?style=flat-square)](https://grona.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Pluggable LLM](https://img.shields.io/badge/LLM-Gemini%20%7C%20OpenAI%20%7C%20Claude-7B61FF?style=flat-square)]()

**Built by [Grona](https://grona.ai) — and shared as MIT for any founder, fund, or operator who needs an investor data room they can host themselves.**

> **A self-hostable investor data room.** Invite-only document portal, PDF / video / spreadsheet viewers, RAG-grounded AI chatbot, and a full admin control plane. Built on Next.js 16, Mongo, and your choice of Gemini / OpenAI / Anthropic. Fork it, brand it, deploy it.

---

## The repo ships as the Acme Capital demo — make it yours with AI

`main` ships with a fully-applied **Acme Capital** brand kit (burnt orange + mustard, mid-century industrial catalogue, cartoon team photos, "Top Secret Anvil Project" persona). This is on purpose: it gives you a real working portal to clone-and-customise from, with a complete `BRAND.md` already documented.

**The fastest way to make it yours is to ask an AI agent.** Open Claude Code, Cursor, or your editor's AI assistant inside this repo and paste [the prompt in REBRAND.md](REBRAND.md) along with whatever you know about your company. The agent will:

- Rewrite `dataroom.config.ts` (brand name, tagline, persona, tier names, team bios)
- Swap the colour ramp in `src/styles/theme-brand.css`
- Generate new SVG logos + favicon
- Re-render the OG card via the existing Playwright template
- Replace the team page content
- Write you a new `BRAND.md` to match

A full rebrand from "Acme" to "your company" takes one prompt and ~10 minutes of AI work. See [REBRAND.md](REBRAND.md) for the prompt template.

**Prefer manual?** Each layer is a single file:

| Layer                                       | File                                                                  |
|--------------------------------------------|-----------------------------------------------------------------------|
| Brand name, tagline, persona, tiers, team   | `dataroom.config.ts`                                                  |
| Colour ramp                                 | `src/styles/theme-brand.css`                                          |
| Logo, favicon, OG image                     | `public/assets/branding/`                                             |
| Team photos                                 | `public/assets/team/`                                                 |
| Local-knowledge markdown                    | `content/*.md`                                                        |
| Brand guidelines (for AI agents to read)    | `examples/acme-capital/BRAND.md`                                      |

**Just kicking the tires?** Two other complete brand kits ship as examples — try the one closest to what you want and modify from there:

```bash
npx tsx bin/use-example.ts greenwood-holdings --yes    # Penguin Classics, dusty navy + brass
npx tsx bin/use-example.ts lighthouse-labs --yes       # Indie SaaS, indigo + amber
npx tsx bin/use-example.ts acme-capital --yes          # back to the default
```

Each has its own `BRAND.md` documenting voice, palette, type, and don'ts — useful inputs to an AI rebrand prompt.

---

## Why this exists

Most investor data rooms are commercial SaaS — fine, but you pay per seat and you put your most sensitive documents on someone else's infrastructure. The ones that aren't SaaS are usually a glorified Dropbox folder with no audit trail, no per-investor access control, and no easy way to answer the questions investors will ask.

This template is the middle ground: a tiny, opinionated codebase you can run on your own Vercel + Mongo Atlas account for a few dollars a month, with everything an investor needs (gated documents, team page, videos, RAG chatbot) and everything an operator needs (invites, revocation, sync, audit log).

It's deliberately small. The whole `src/lib/` is ~3000 lines. One person can hold it in their head.

## What's in the box

**For investors**

- Invite-only signup (one-time tokenised link, password choice on accept)
- Document portal with PDF / video / spreadsheet viewers
- Team page, videos page, optional both
- AI chatbot grounded in your pitch documents (cites sources, falls back gracefully when it doesn't know)
- Per-tier access — different investors see different documents

**For operators**

- Admin shell separate from the portal
- Invite, revoke, restore investors (with audit trail)
- Google Drive sync on a cron — write documents in Drive, they appear in the portal
- "Re-index knowledge base" button for the RAG layer
- Activity log of every login, view, and admin action

**For developers**

- Single-file config (`dataroom.config.ts`) — brand, tiers, providers, persona, navigation
- Pluggable LLM provider (Gemini / OpenAI / Anthropic for chat; Gemini / OpenAI for embeddings)
- Interactive setup wizard (`npm run setup`) with connectivity tests — handles `.env.local` only; the brand is yours to own
- Pre-flight validator (`npm run check`) — catches misconfigured env (and reminds you if you're still on a shipped demo brand) before you boot
- Three fully-branded example datasets (Acme Capital · Greenwood Holdings · Lighthouse Labs) — each ships a `BRAND.md` with voice, palette, type, logo system, applications, and don'ts; pasteable into an AI agent for a custom rebrand

## Quickstart (10 minutes)

Prerequisites: Node 20+, a free Mongo Atlas cluster, an API key for one of Gemini / OpenAI / Anthropic.

```bash
git clone https://github.com/my-username/open-dataroom
cd open-dataroom
npm install
npm run setup       # operational wizard — writes .env.local (DB, API keys, admin seed). Leaves the Acme demo brand intact; rebrand via REBRAND.md.
npm run check       # pre-flight validation (✓/✗/⚠/· per category)
npm run dev         # http://localhost:3000
```

Log in with the admin email/password the wizard printed. From there:

1. Go to `/admin/invites` and invite yourself a second email — verify the invite link arrives (or check the server log if you skipped SMTP).
2. Drop a PDF into your configured Drive folder. Click "Sync now" in the dashboard.
3. Click "Re-index knowledge base". Open the chat panel, ask a question grounded in the PDF.

If all three work, you have a functioning data room. Move on to [docs/deploy.md](docs/deploy.md) for the Vercel push.

## Try a worked example

```bash
npm run example:lighthouse-labs       # no tiers, Gemini-only, markdown KB
# OR
npm run example:greenwood-holdings    # one tier, Anthropic chat + OpenAI embeddings
# OR
npm run example:acme-capital          # multi-tier, OpenAI, custom RAG weights
```

Each command swaps `dataroom.config.ts` and `content/` for the example's contents. Restore with `git checkout -- dataroom.config.ts content/ public/` (plus `git clean -fd content/` if the example added untracked files).

## Architecture, in one paragraph

Next.js 16 App Router. Edge middleware does JWT signature checks, then API routes do the DB lookup + `tokenVersion` reconcile. Mongo (Mongoose) for everything: users, invites, documents, knowledge chunks, sync history, access log. Google Drive is the canonical document store; sync is a read-mirror. Keyword RAG over chunks of PDF/spreadsheet/markdown text; embeddings are computed and stored but not queried (vector swap is documented as a 30-min extension). The chat panel streams NDJSON from `/api/chat`. The LLM call is wrapped in an adapter interface so the three provider SDKs are interchangeable.

See [docs/architecture.md](docs/architecture.md) for the longer version.

## Configuration

Everything user-tunable lives in `dataroom.config.ts`. The shape is documented in [docs/customize.md](docs/customize.md) — every field, every footgun, with examples. The `.env.local` file holds secrets (Mongo URI, provider API keys, JWT secret); `.env.local.example` is the committed template.

## Security

The template defends what a small data room reasonably can: authenticated sessions, tier-gated access, JWT revocation, audit logging, CSP headers. It does **not** prevent a logged-in investor from extracting a PDF via DevTools — no browser-rendered document does. Read [docs/security.md](docs/security.md) before you go live; it's honest about the limits and lists the production-hardening steps (Upstash rate limit swap, AccessLog TTL, etc.).

Vulnerability disclosure: [SECURITY.md](SECURITY.md).

## Deploy

First-class target is Vercel. [docs/deploy.md](docs/deploy.md) walks the push, the Atlas setup, Gmail SMTP gotchas, free-tier ceilings, EU data residency, and the post-launch operational checklist. Self-hosted is supported (it's stock Next 16); we don't ship a Dockerfile but a 20-line one works.

## Docs

- [`docs/architecture.md`](docs/architecture.md) — what's where, request paths, the LLM adapter contract
- [`docs/customize.md`](docs/customize.md) — every config field with examples
- [`docs/security.md`](docs/security.md) — threat model, what's defended, what isn't
- [`docs/deploy.md`](docs/deploy.md) — Vercel quickstart + ops checklist
- [`docs/rag.md`](docs/rag.md) — RAG pipeline + vector-search swap recipe
- [`docs/google-drive.md`](docs/google-drive.md) — folder convention, service account setup
- [`SECURITY.md`](SECURITY.md) — vulnerability disclosure
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — PR scope philosophy + style
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) — short, in plain English

## Non-goals

Things the template intentionally does NOT include — see [CONTRIBUTING.md](CONTRIBUTING.md) for the full list:

- Vector search (keyword retrieval ships; vector swap is documented)
- SSO / OAuth / magic-link auth
- Internationalisation (English only)
- Dark mode (deliberately removed; restoration recipe in `docs/customize.md`)
- Multi-tenant (one company per deployment)
- DRM / watermarking / true no-download enforcement

## Stack

- [Next.js 16](https://nextjs.org/) App Router with Turbopack
- [Mongoose](https://mongoosejs.com/) on Mongo Atlas
- [Tailwind v4](https://tailwindcss.com/) with CSS custom properties
- [@clack/prompts](https://github.com/natemoo-re/clack) for the wizard
- [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai), [openai](https://www.npmjs.com/package/openai), [@anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk) — all three, behind a unified adapter
- [unpdf](https://www.npmjs.com/package/unpdf) + [ExcelJS](https://www.npmjs.com/package/exceljs) for text extraction
- [nodemailer](https://nodemailer.com/) for transactional email
- [googleapis](https://www.npmjs.com/package/googleapis) for Drive sync

## License

[MIT](LICENSE). Use it commercially, fork it, modify it, sell it, don't tell us. We'd love attribution if you ship a public deployment — set `brand.poweredByCreditUrl` to your own fork's URL or leave the default badge.

## Contributing

PRs welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening one — the scope bar for the upstream repo is deliberately high (changes should benefit most forkers, not solve one deployment's problem). Most forks should diverge, not contribute back.
