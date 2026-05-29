# Customize

Every user-tunable field lives in `dataroom.config.ts`. This doc walks each field with examples and the gotchas worth knowing before you ship.

> **Screenshots are pending.** The Phase 8.1 follow-up will add before/after captures for the visual sections (branding, theme, navigation). In the meantime, this doc shows config snippets and describes the visible effect in words.

Sections, in the same order they appear in the file:

1. [`brand`](#brand) — name, tagline, domain, footer
2. [`assets`](#assets) — logos, favicons, OG image
3. [`theme`](#theme) — primary + accent colours
4. [`ai`](#ai) — chat + embeddings providers
5. [`email`](#email) — From name, subjects, footer
6. [`access`](#access) — investor tiers
7. [`documents`](#documents) — category labels + RAG weights
8. [`navigation`](#navigation) — portal + admin sidebar items
9. [`team`](#team) — the optional team page
10. [`videos`](#videos) — the optional videos page
11. [`chatbot`](#chatbot) — persona, starters, privacy notice
12. [`localKnowledge`](#localknowledge) — markdown sources fed to RAG
13. [`technical`](#technical) — chunk size, TTLs, cron

---

## `brand`

```ts
brand: {
  name: "Lighthouse Labs",          // Used in <title>, emails, admin display name
  tagline: "...",                   // Landing card subtitle
  supportEmail: "hello@example.com",
  domain: "https://lighthouse.example.com",  // Absolute, no trailing slash
  cdnDomain: null,                  // Or "cdn.example.com" to allowlist for next/image
  legalFooter: "© 2026 Lighthouse Labs. All rights reserved.",
  poweredByCredit: true,            // Renders the "Powered by open-dataroom" badge
  poweredByCreditUrl: "https://github.com/my-username/open-dataroom",
}
```

**`legalFooter` is overloaded.** It renders in the portal sidebar AND as the email footer disclaimer. Forks that want a longer email-specific text (the typical "this email contains confidential information…" boilerplate) should edit `src/lib/email-templates.ts` directly rather than try to cram it into this one field.

**`cdnDomain` must match `next.config.ts`.** If you change it here, also update `images.remotePatterns` in `next.config.ts` or `next/image` will refuse to optimise images from the new host.

**`poweredByCreditUrl`** is only read when `poweredByCredit` is `true`. Forks that want to credit their own repo should change it; forks that want to remove the badge entirely should set `poweredByCredit: false`.

---

## `assets`

```ts
assets: {
  logoLight: "/assets/branding/logo-light.svg",
  logoDark:  "/assets/branding/logo-dark.svg",   // Unused while light-only
  faviconSvg: "/assets/branding/favicon.svg",
  faviconPng: "/assets/branding/favicon.png",
  ogImage:   "/assets/branding/og.png",          // 1200×630 recommended
}
```

Paths are relative to `/public`. The shipped placeholders are neutral wordmarks safe to keep through development; replace them before you go public.

**`logoDark`** is read into the type contract but never rendered today. Dark mode was deliberately removed (the dead-code-in-OSS-template problem) — the field stays for a future revival. Restoration recipe: restore the dark-mode token block in `src/styles/theme.css`, drop `forcedTheme="light"` from `src/providers/theme.tsx`, sanity-check contrast. ≈3 hours.

---

## `theme`

```ts
theme: {
  primary: "#0F172A",     // Browser theme-color + admin badges
  accent:  "#3B82F6",     // Email link colour + URL preview
}
```

**The actual UI colour ramp is NOT generated from `primary`.** It lives in `src/styles/theme-brand.css` as 12 hand-tunable RGB lines. Editing `primary` here updates the meta tag and a couple of admin-page hints; the rest of the UI ramps live in CSS for predictability.

**CTA button white text** assumes `primary` is dark enough to clear ~4.5:1 contrast with white. A pastel primary (e.g. `#FFD580`) will fail accessibility. Run any candidate through a WCAG contrast checker before shipping.

**`accent` and `primary` collapse in some email previews** when they're set to the same value. Pick a perceptibly lighter accent (HSL +15% lightness is a good rule of thumb) if you want the email links to stand out.

---

## `ai`

```ts
ai: {
  chatProvider:      "gemini",                          // "gemini" | "openai" | "anthropic"
  chatModel:         "gemini-3.1-pro-preview",
  embeddingsProvider:"gemini",                          // "gemini" | "openai"  — Anthropic has none
  embeddingsModel:   "embedding-001",                   // 768-dim
}
```

Provider defaults:

| Provider | Chat model default | Embeddings default | Dim |
|---|---|---|---|
| `gemini` | `gemini-3.1-pro-preview` | `embedding-001` | 768 |
| `openai` | `gpt-4o` | `text-embedding-3-small` | 1536 |
| `anthropic` | `claude-sonnet-4-5` | *use gemini or openai* | — |

**Switching `embeddingsProvider` silently invalidates existing chunks.** A 768-dim Gemini vector cannot be compared to a 1536-dim OpenAI vector. Today this is dormant — `searchChunks` is keyword-only — but the day vector search ships, mixed-dim chunks will corrupt the index. Until then, the safe operation is: wipe `knowledgechunks`, change the provider, re-run "Re-index knowledge base" in admin. See [docs/rag.md](rag.md).

**Anthropic + embeddings.** Anthropic doesn't ship an embeddings API. If chat is Anthropic, `embeddingsProvider` must be `"gemini"` or `"openai"`. The setup wizard prompts for the second key when it sees `chatProvider: "anthropic"` in your config; `factory.ts` returns `undefined` for invalid combinations so a manual edit that breaks the rule crashes at first use rather than at boot.

---

## `email`

```ts
email: {
  fromName: "Lighthouse Labs",
  notificationRecipient: "admin@example.com",   // Where invite-accepted notifications go
  logoPath: "/assets/email-logo.png",           // Inlined as CID — works everywhere
  subjects: {
    invite:   "{{brand}} — you're invited to the data room",
    reset:    "{{brand}} — reset your password",
    accepted: "{{name}} joined the data room",
  },
  subFooter: "Sent automatically. Do not reply to this email.",
}
```

**`logoPath` requires a `next.config.ts` edit.** Vercel's serverless bundler only includes files explicitly traced. If you change this path, also update `outputFileTracingIncludes` in `next.config.ts` or the file won't ship and emails will arrive logo-less.

**Template variables.** `{{brand}}` in any subject is replaced with `brand.name`. `{{name}}` in `accepted` is the new investor's display name. Adding new variables means editing `src/lib/email-templates.ts`.

**From address** is `EMAIL_USER` from `.env.local`, not from config. This stays in env because rotating SMTP credentials shouldn't require a redeploy.

---

## `access`

```ts
access: {
  tiers: [
    { id: "seed",   label: "Seed",   description: "Pre-seed and seed investors" },
    { id: "growth", label: "Growth", description: "Series A onward",
      colour: "bg-blue-100 text-blue-700" },
  ],
  tierContext: {
    seed: "This investor backed the seed round and has access to formative materials.",
    growth: "This investor entered at Series A. Highlight commercial traction.",
  },
}
```

**Empty `tiers` = no tier dropdowns.** Every approved investor sees every document. Lighthouse Labs ships this way.

**`tier.id` is the canonical slug.** It appears in JWT payloads, DB rows, and the Drive folder convention (a Drive folder named `seed/` maps to `tier.id = "seed"`). Change the slug once you have live data and existing investors are stranded — see migration below.

**`colour`** accepts any Tailwind class string. Used only on the admin invite-form tier badges and the admin dashboard tier filter.

**`tierContext`** is appended to the chatbot's system prompt when the active investor has that tier. Use it to nudge persona behaviour per audience ("this investor is a strategic, not financial, partner — lead with product, not metrics").

### Tier footguns

**(d) `Shared/` folder is multi-tier-only.** With tiers configured, a top-level Drive folder named `Shared/` is treated as a fan-out: every tier sees its contents. In no-tier mode (empty `tiers`) the same folder name is just a regular category called `"shared"` — benign but counter-intuitive.

**(e) Removing a tier strands existing users.** A user whose `tier === "growth"` queries `documents` with that filter; if you delete `growth` from config, their tier filter matches zero rows. Re-assign affected users (PATCH `/api/admin/invites` with a new tier id) *before* deleting a tier from config.

**(f) `POST /api/admin/invites` requires a tier in multi-tier mode.** A historical bug silently accepted a missing tier and minted users that saw every document. The fix made the field required. Forks that want "any logged-in user sees everything" should configure no tiers, or use the single-all-access-tier pattern.

**(g) Migrating an existing tenant.** Documents whose Drive folder names don't match any `tier.id` or `tier.label` get soft-deleted on the first post-refactor sync (the ghost-tier policy). Either rename Drive folders to match config OR add tiers matching the existing folder names before running sync.

**(h) Tier-less investor in multi-tier mode returns 403** from `/api/documents` and `/api/chat`: *"Your account has no access tier assigned. Please contact the admin."* Affects pre-Phase-4 user rows, direct-DB edits, and config-drift cases. Resolution: PATCH a tier onto the user via `/api/admin/invites`, or downgrade the deployment to no-tier mode.

**(l) PATCH invites cannot blank an accidentally-set tier in multi-tier mode.** `validateTier("")` accepts undefined, then the PATCH-side guard rejects undefined. This is intentional — empty-tier-in-multi-tier is exactly the privilege-escalation case we defend against. To clear a tier: delete the invite and reissue.

---

## `documents`

```ts
documents: {
  categoryLabels: {
    "business-plan": "Business Plan",
    "pitch-deck": "Pitch Deck",
  },
  importanceWeights: {
    "business-plan": 1.5,
    "pitch-deck":    1.2,
    "shared":        0.9,
  },
}
```

**`categoryLabels`** maps Drive folder slugs (kebab-case derivation of the folder name) to pretty UI labels. Anything not listed uses the slug as-is.

**`importanceWeights`** is multiplied into the keyword score during RAG retrieval. `1.0` is neutral. Higher → preferred when ranking ties. Use sparingly — large jumps (`>2.0`) will swamp keyword match strength and make retrieval feel random.

---

## `navigation`

```ts
navigation: {
  portal: [
    { label: "Home",      href: "/portal",                     icon: "home" },
    { label: "Documents", href: "/portal/documents",           icon: "document" },
    { label: "Team",      href: "/portal/team",                icon: "team" },
    { label: "Videos",    href: "/portal/videos",              icon: "video" },
  ],
  admin: [
    { label: "Dashboard", href: "/admin" },
    { label: "Documents", href: "/admin/documents" },
    { label: "Invites",   href: "/admin/invites" },
    { label: "Activity",  href: "/admin/activity" },
  ],
}
```

**Icons** are one of `"home" | "document" | "team" | "video"` and only render in the portal sidebar. Admin items render without icons.

**Removing an item doesn't disable the route.** If you remove `Videos` from `portal` but `videos.enabled` is `true`, the page still exists at `/portal/videos` — you've just hidden the link. Set `videos.enabled: false` if you want the route gone.

---

## `team`

```ts
team: {
  enabled: true,
  headline: "The team",
  story: "Two-paragraph founder/team story.",
  members: [
    {
      name: "Jane Doe",
      role: "CEO & Co-founder",
      bio: "One sentence.",
      linkedinUrl: "https://linkedin.com/in/example",
      photo: "/assets/team/jane.jpg",   // Relative to /public
    },
  ],
}
```

`enabled: false` makes `/portal/team` redirect to `/portal`. Also remove the nav item in `navigation.portal` to hide the link.

---

## `videos`

```ts
videos: {
  enabled: true,
  items: [
    { title: "Product demo", youtubeId: "dQw4w9WgXcQ" },
    { title: "Founder intro", description: "5 min", mp4Url: "https://cdn.example.com/intro.mp4" },
  ],
}
```

Items are either `{ youtubeId }` (embedded via YouTube iframe with privacy-enhanced mode) or `{ mp4Url }` (served direct with the native HTML5 player). `enabled: false` → page redirects, same as team.

---

## `chatbot`

```ts
chatbot: {
  enabled: true,
  headerTitle: "Ask anything",
  headerSubtitle: "Grounded in this data room",
  greeting: "Hi — what would you like to know?",
  emptyKnowledgeMessage: "The knowledge base hasn't been indexed yet. Ask the admin to run a re-index.",
  errorMessage: "Something went wrong. Try again?",
  placeholderText: "Ask a question…",

  persona: `You are the AI assistant for {{brand}}. Be concise, factual, and warm…`,

  starterQuestions: [
    "What does {{brand}} do?",
    "Who's on the team?",
    "What's the funding history?",
  ],

  topicPreferences: {
    "team": ["about-the-founder", "team"],
    "funding": ["the-ask", "cap-table"],
  },

  greetingPatterns: ["hi", "hello", "hey", "good morning"],

  suppressPlatformAttribution: false,

  privacyNotice: "Your messages are processed by Google Gemini. Don't share confidential info.",
}
```

**`persona` is the system prompt body** — the bot's voice. Mechanical guard rails (citation format, "don't speculate", "answer from sources") are appended by `src/lib/chat.ts` and are not user-tunable. Forks should rewrite the persona freely without touching guard rails.

**`{{brand}}`** in any chatbot string is replaced at render with `brand.name`.

**`greetingPatterns`** preserve the `needsRAG()` fast-path: messages whose normalised body (lowercase, trailing punctuation stripped) **exactly equals** any pattern skip retrieval entirely. The bot answers from persona alone — no source citations, no token spend on context assembly. Note that `chat.ts` also applies a hardcoded fallback that skips RAG for any message of ≤2 words without a `?`, regardless of `greetingPatterns` — so an empty patterns list does **not** mean every message hits RAG. To force RAG on every message you'd have to edit `src/lib/chat.ts` and remove the fallback.

**`suppressPlatformAttribution`** disables the built-in "I'm running on open-dataroom" easter-egg response. Default is `false` (the bot owns up to the framework when asked). Set to `true` for white-label deployments.

**`privacyNotice`** renders as muted text above the chat input. Null = no notice. GDPR-bound deployments should customise to name the actual provider and link to the privacy policy.

---

## `localKnowledge`

```ts
localKnowledge: [
  { path: "content/about-the-founder.md", title: "About the founder", category: "about" },
  { path: "content/the-ask.md",           title: "The ask",            category: "funding" },
],
```

Each entry points at a markdown file the RAG pipeline should index alongside Drive documents. Files are chunked the same way as PDFs and surfaced in citations with `title`.

**`category`** is matched against `documents.importanceWeights` for RAG ranking. Use existing category slugs where you can.

**Skip `localKnowledge` entirely** if your knowledge base lives only in Drive. Lighthouse Labs is the inverse: zero Drive docs, six markdown files.

---

## `technical`

```ts
technical: {
  chunkSize: 1200,           // Characters, not tokens
  chunkOverlap: 200,
  retrievalTopK: 5,          // Top-N chunks passed to the model
  sessionAccessTtl: "15m",   // JWT access token
  sessionRefreshTtl: "7d",   // JWT refresh token
  inviteExpiryDays: 14,
  cronSyncSchedule: "0 6 * * *",     // Vercel Cron format — informational; vercel.json is authoritative
}
```

**Don't bump `chunkSize` above ~2000 without checking your provider's context limit math.** With `retrievalTopK: 5` and `chunkSize: 2000` you're passing ~10k chars of context per turn before the user's actual message. Gemini Pro handles it; smaller models will truncate.

**`sessionAccessTtl: "15m"` is the only place that controls how fast a revocation propagates.** The tokenVersion check at every request invalidates instantly, but the cookie remains valid for the access TTL until the client tries to refresh. Lower TTL = stronger revocation latency; higher TTL = fewer refresh round-trips.

**`cronSyncSchedule`** must also be in `vercel.json` — Vercel reads its cron config from there, not from this field. The config value is currently informational. (PR welcome to wire the two together.)

---

## Revocation, restore, and audit

**(j) Admin Revoke/Restore UI only shows users created via invite.** The page joins users to invites by email. DB-seeded investors (a fork that scripted accounts directly) don't appear in this UI. Revoke them via direct DB edit, or add a matching invite row.

**(k) AccessLog shape for revoke/restore actions.** `admin_revoke` and `admin_restore` rows record the *acting admin* in `userId`/`userName`/`userEmail` and the *affected user* in `resourceId`/`resourceName`. Operators querying "all events against investor X" should filter on `{ $or: [{ userId: X }, { resourceId: X.toString() }] }` rather than just `{ userId: X }`, or revokes against the victim won't surface.

**(i) Empty-Drive sync.** If `syncFromDrive()` finds zero documents AND the DB already holds existing documents, it aborts with a `failed` status and an error message mentioning `GOOGLE_DRIVE_FOLDER_ID` and service-account access. This guard exists to prevent a broken token from mass-flipping every existing document to inactive. **A fresh install with an empty Drive is a legitimate no-op** — no `failed` row is written in that case. When the guard fires on an established deployment, a renamed-tier-folder config drift is also a possible cause; the ghost-tier warnings in `SyncHistory.details` show which folders got skipped.

---

## Reset / try an example

```bash
npx tsx bin/use-example.ts lighthouse-labs --yes
npm run dev
```

To restore the shipped defaults afterward:

```bash
cp dataroom.config.ts.bak dataroom.config.ts        # if you made one
# OR
git checkout -- dataroom.config.ts content/ public/
# AND remove any untracked content/*.md files the example added
git clean -fd content/ public/assets/team/ public/assets/branding/
```

`git checkout` does NOT remove untracked files — examples that ship new markdown (Lighthouse Labs ships six) leave them behind unless you `git clean`.
