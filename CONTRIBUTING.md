# Contributing to open-dataroom

Thanks for picking this up. This template is meant to be forked-and-modified — the bar for "useful contribution to the upstream repo" is therefore deliberately high: changes should benefit *most* forkers, not solve a problem specific to one deployment.

## Before you open a PR

1. **Open an issue first** for anything beyond a typo fix or a small bug. A two-line "I'd like to do X — is this in scope?" saves us both time. Maintainers will tell you within a few days whether the direction is welcome.
2. **Run the full check loop locally** before pushing: `npm run build` (must compile cleanly), `npx tsc --noEmit` (must pass), `npm run check` (must show ✓ for the categories you've touched).
3. **Round-trip the examples** if you've touched anything in `src/lib/` or `src/app/`: `npx tsx bin/use-example.ts acme-capital --yes && npm run build && git checkout -- dataroom.config.ts content public` should still succeed.

## What we will probably accept

- Bug fixes with a clear repro.
- Documentation improvements (especially for `docs/customize.md` and `docs/deploy.md`).
- New example datasets that exercise a config slice the current three don't cover. Use `examples/acme-capital/` as the template — a complete example ships a `dataroom.config.ts`, `theme-brand.css`, `BRAND.md`, SVG logos + favicon, an OG image render, and any content/team assets it needs. `bin/use-example.ts` swaps each layer on `npm run example:<slug>`.
- Adapter additions for new LLM providers, provided the existing `ChatProvider` / `EmbeddingsProvider` contracts in `src/lib/llm/types.ts` stay unchanged.
- Drive / S3 provider additions that don't change the existing API surface.

## What we will probably decline

- Features that fork the codebase rather than configure it. If your change is "I added a setting to do X for my deployment", consider whether your fork is the right home for it instead.
- Dependency-only updates without a stated reason (security patch, fixing a real bug, unblocking a feature).
- New top-level non-goals that the [plan §10](#non-goals) explicitly excludes (vector search, SSO, mobile-native, internationalisation, multi-tenant, DRM).
- Stylistic rewrites without behavioural change.

## Code style

- TypeScript everywhere, `strict: true`.
- Two-space indent, semicolons on, double-quoted strings — match existing files.
- Comments explain *why*, not *what*. If a comment paraphrases the next line of code, delete it.
- Don't add ad-hoc test scripts at the repo root. If you write one for local debugging, gitignore it or delete it before opening the PR.
- Don't introduce a new dependency to save five lines of code.

## Commit messages

One commit per logical change. Subject line under 72 characters, imperative mood, no trailing period. If the body needs detail, separate it from the subject with a blank line and wrap at 80 columns.

```
Fix tier label injection in wizard config template

JSON.stringify both the key and the user-visible label so apostrophes
or backticks in a tier name can't break out of the generated TypeScript
string literal. Caught by the Phase 7 review pass.
```

## Releases and versioning

Semver. Breaking changes (anything that requires forkers to edit `dataroom.config.ts` or migrate data) ship in major versions only. Minor versions add features; patch versions fix bugs.

## Security issues

Do **not** report security issues in public issues or PRs. See [SECURITY.md](SECURITY.md) for the disclosure channel.

## Code of conduct

All participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Read it before your first contribution.

---

## Non-goals

The following are intentionally out of scope for this template — please don't open PRs adding them:

- Vector search (keyword retrieval is the shipped path; vector swap is documented in `docs/rag.md` as an extension).
- SSO / OAuth / magic-link auth (email+password + invite tokens only).
- Internationalisation (English only).
- Dark mode (deliberately removed; restoration recipe lives in `docs/customize.md`).
- Multi-tenant deployments (one company per instance).
- DRM / true no-download enforcement (the viewer is best-effort by design; `docs/security.md` is honest about it).
- Mobile-native apps (responsive web only).
- SOC2 / ISO compliance tooling.
