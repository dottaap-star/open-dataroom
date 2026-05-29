## What this changes

One paragraph. What is different after this PR than before?

## Why

Link the issue that motivated the change. If there's no issue, explain the user-visible problem this solves and confirm it's in scope per [CONTRIBUTING.md](../CONTRIBUTING.md).

## How

The interesting decisions in the diff. Skip anything that's obvious from reading the code; spend the words on choices that aren't (why this data structure, why a new file instead of extending an existing one, why this trade-off).

## Test plan

- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit --skipLibCheck` is clean
- [ ] `npm run check` shows no new ✗ rows for categories I touched
- [ ] Round-tripped at least one example: `npx tsx bin/use-example.ts <slug> --yes && npm run build`
- [ ] (UI change) Verified in a browser at `/portal` and `/admin`
- [ ] (Schema change) Updated `examples/*/dataroom.config.ts` to match
- [ ] (New env var) Updated `.env.local.example` and the wizard

## Docs touched

- [ ] `docs/customize.md` — for any new `dataroom.config.ts` field
- [ ] `docs/security.md` — for any auth, CSP, or audit-log change
- [ ] `docs/rag.md` — for any chat or retrieval change
- [ ] `docs/deploy.md` — for any new external dependency or deploy-time concern
- [ ] `README.md` — for anything visible in the quickstart

## Breaking change?

If yes, describe the migration path. Forkers should be able to upgrade without losing data or having to re-onboard investors.

## Out-of-scope confirmation

I've read the non-goals list in [CONTRIBUTING.md](../CONTRIBUTING.md) and confirm this PR does not introduce one of them. (Delete this line if you're sure.)
