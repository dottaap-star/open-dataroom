---
name: Bug report
about: Report a defect in the template
title: "[bug] "
labels: bug
assignees: ''
---

## What happened

A clear, factual description of the bug. What did you expect? What did you see instead?

## Reproduction

Step-by-step. Assume the reader has a fresh clone:

1. `git clone …`
2. `npm install`
3. `npm run setup` (paste relevant answers below)
4. …

If the bug only triggers with a specific config, please paste the relevant slice of `dataroom.config.ts` (redact secrets).

## Environment

- Node version: `node --version` →
- Package manager: npm / pnpm / yarn
- OS: macOS / Linux / Windows
- Deploy target: local / Vercel / self-hosted
- Chat provider: gemini / openai / anthropic
- Embeddings provider: gemini / openai

## `npm run check` output

Paste the relevant lines. Redact API keys if any leak.

```
$ npm run check
…
```

## Logs

Paste any relevant server logs, browser console output, or stack traces. Use a `<details>` block for anything over ~30 lines.

## What you've already tried

Saves us suggesting the obvious. "I restarted the dev server, regenerated my Mongo URI, and ran `npm run check` — still fails" is the right level.
