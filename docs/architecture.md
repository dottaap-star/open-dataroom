# Architecture

A short tour of what's where and why. If you're trying to extend or replace something, this is the file that points you at the right code.

## The shape

```
open-dataroom/
├── bin/                          One-shot scripts run via tsx
│   ├── setup.ts                  Interactive @clack/prompts wizard
│   ├── check.ts                  Pre-flight validator
│   └── use-example.ts            Swap dataroom.config.ts + content for a worked example
│
├── content/                      Markdown sources for localKnowledge (RAG)
│
├── dataroom.config.ts            The single source of truth for branding,
│                                 tiers, providers, persona, navigation.
│                                 Edge-runtime safe (no node imports).
│
├── docs/                         You are here.
│
├── examples/                     Three opt-in datasets
│   ├── acme-capital/             Multi-tier + OpenAI + custom importance weights
│   ├── greenwood-holdings/       Single tier + Anthropic chat + OpenAI embeddings
│   └── lighthouse-labs/          No tiers + Gemini-only + rich localKnowledge
│
├── public/assets/                Logos, favicons, team photos, OG image
│
├── src/
│   ├── app/                      Next.js 16 App Router (RSC + edge middleware)
│   │   ├── (admin)/              Admin shell + dashboard, invites, docs, activity
│   │   ├── (auth)/               Login, signup-via-invite, password reset
│   │   ├── (portal)/             Investor portal: documents, team, videos, chat
│   │   └── api/
│   │       ├── admin/            Invites, users (revoke/restore), sync, rag, dashboard
│   │       ├── auth/             Login, refresh, logout, password reset, validate-invite
│   │       ├── chat/             RAG-grounded streaming chat (NDJSON)
│   │       ├── cron/             /api/cron/sync — invoked by Vercel Cron
│   │       └── documents/        Listing + signed-URL viewer
│   │
│   ├── lib/                      All business logic. Server-only unless noted.
│   │   ├── auth.ts               JWT issue/verify, tokenVersion revocation, seedAdmin
│   │   ├── chat.ts               RAG pipeline: needsRAG → search → assemble → stream
│   │   ├── config.ts             Frozen runtime export of dataroom.config.ts
│   │   ├── config-types.ts       Type contract — edge-runtime safe
│   │   ├── db.ts                 Mongoose singleton
│   │   ├── drive.ts              Google Drive client (service account)
│   │   ├── sync.ts               Drive → Mongo doc index, tier folder convention
│   │   ├── email.ts              nodemailer SMTP wrapper
│   │   ├── email-templates.ts    Branded HTML/text templates
│   │   ├── geo.ts                IP → city via ip-api.com (non-blocking, 3s timeout)
│   │   ├── s3.ts                 Optional S3 presign helper
│   │   ├── llm/                  Pluggable provider adapters
│   │   │   ├── types.ts          ChatProvider / EmbeddingsProvider contracts
│   │   │   ├── gemini.ts         @google/generative-ai adapter
│   │   │   ├── openai.ts         openai adapter
│   │   │   ├── anthropic.ts      @anthropic-ai/sdk adapter (chat only)
│   │   │   └── factory.ts        getChatProvider() / getEmbeddingsProvider()
│   │   ├── models/               Mongoose schemas (User, Invite, Document,
│   │   │                         KnowledgeChunk, SyncHistory, AccessLog,
│   │   │                         PasswordReset)
│   │   └── rag/                  Retrieval pipeline
│   │       ├── chunk.ts          Sliding-window chunker (chars, not tokens)
│   │       ├── embed.ts          Provider-agnostic embedding call
│   │       ├── extract.ts        unpdf + ExcelJS text extraction
│   │       ├── ingest.ts         Drive-doc → chunks, SHA-256 dedup
│   │       ├── ingest-local.ts   content/*.md + localKnowledge entries → chunks
│   │       └── search.ts         Keyword scorer with importance weights
│   │
│   └── styles/                   Tailwind v4 + CSS custom properties
│
└── package.json
```

## Request paths

**Investor visits `/portal`.** Edge middleware decodes the JWT (no DB call) and either redirects to `/login` or sets a header with `userId`. Server component fetches the user via Mongoose, renders the portal layout, and lazy-loads the chat panel.

**Investor sends a chat message.** Client POSTs to `/api/chat`. The route:

1. Verifies the JWT and looks up the user (`getCurrentUser` checks `tokenVersion`).
2. Runs `needsRAG()` against `config.chatbot.greetingPatterns` — if a greeting, skips retrieval and emits a single chunk of stream.
3. Builds a history-augmented search query (capped at 200 chars).
4. Calls `searchChunks()` — keyword score + `config.documents.importanceWeights` + `config.chatbot.topicPreferences`, tier-filtered by `ctx.tier`.
5. Assembles the system prompt: `config.chatbot.persona` + guard rails + tier context + retrieved sources.
6. Streams the response via the active `ChatProvider` as NDJSON: `sources → text* → done` or `sources → error`.

**Admin clicks "Sync now".** POST `/api/admin/sync` → `syncFromDrive()` walks the configured Drive folder, diffs against `Document` rows, flips orphans to `isActive: false`, inserts new ones, records a `SyncHistory`. Guarded by `syncRecordFinalized` so a thrown error doesn't overwrite a deliberate "failed" status.

**Admin revokes an investor.** POST `/api/admin/users/[id]/revoke` → `$inc: { tokenVersion: 1 }, $set: { isActive: false }` plus an `AccessLog` row with action `admin_revoke`. Self-revoke is blocked with 400. The investor's next request — within seconds — fails `getCurrentUser`'s `tokenVersion` check and returns 401.

## Edge runtime constraint

`src/lib/config.ts` and `src/lib/config-types.ts` are imported from `src/middleware.ts`, which Next runs on the edge runtime. Neither file may import anything node-only (`mongoose`, `googleapis`, `nodemailer`, the LLM SDKs). If you add a field that needs node-side validation, do it inside `src/lib/auth.ts` or a route handler — not in `config.ts`.

The frozen export is `Object.freeze`'d recursively at module load. Mutating `config.brand.name` at runtime throws.

## LLM adapter contract

`ChatProvider.streamChat(systemPrompt, history, userMessage, abortSignal?)` returns `AsyncIterable<string>`. Each adapter is responsible for rewrapping the call into the provider's native shape:

- **Gemini** — `systemPrompt` goes into `systemInstruction`; history maps to `parts`.
- **OpenAI** — `systemPrompt` becomes the first `{ role: "system" }` message.
- **Anthropic** — `systemPrompt` goes into the top-level `system` parameter (not in messages); abortSignal forwards via `{ signal }` on `client.messages.stream`.

`EmbeddingsProvider.embedQuery(text)` returns `Promise<number[]>` and `.embed(texts[])` returns `Promise<number[][]>`. Anthropic doesn't ship an embeddings adapter; if `config.ai.chatProvider === "anthropic"`, `embeddingsProvider` must be `"gemini"` or `"openai"` in `dataroom.config.ts` (the setup wizard prompts you for the second key when it detects an Anthropic config). `factory.ts` returns `undefined` for unsupported provider strings — a manual misconfiguration will crash at first use rather than at boot.

The whole point of the contract is that nothing in `src/app/`, `src/lib/chat.ts`, or `src/lib/rag/` imports a provider SDK directly. Only `bin/setup.ts` and `bin/check.ts` do, because their job is to test connectivity before the rest of the app boots.

## RAG model

Keyword retrieval. Embeddings are computed and stored per-chunk (so a future vector-search swap is one query change) but never queried today. See [docs/rag.md](rag.md) for the full path and the vector-search recipe.

## Data model

Seven collections, all in one database:

- `users` — investors + admins. Indexed on `email`. `tokenVersion` increments on revoke.
- `invites` — pending sign-up tokens. Partial unique index on `email` where `status: pending`.
- `documents` — Drive-mirrored documents. Indexed on `tier` and `category`.
- `knowledgechunks` — RAG chunks. `documentId` + `chunkIndex` unique compound.
- `synchistories` — Each sync run. Indexed on `startedAt`.
- `accesslogs` — Audit trail (login, doc view, admin actions, revoke/restore).
- `passwordresets` — Single-use reset tokens.

`AccessLog` grows unbounded; production deployments should add a TTL index. See [docs/security.md](security.md).

## What's deliberately not here

- No global state machines, no event bus, no message queue.
- No background workers other than Vercel Cron hitting `/api/cron/sync`.
- No build-time data generation beyond `next build`.
- No client-side data store beyond React component state.

The whole template is meant to be small enough that one person can hold it in their head. If you find yourself reaching for Redux or a job queue, you've probably outgrown the template and forking deeper is the right move.
