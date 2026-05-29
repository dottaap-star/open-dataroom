# RAG

How retrieval works today, what gets indexed, and how to swap in vector search if you want to.

## The pipeline

```
Drive doc or content/*.md
         │
         ▼
   extract.ts ──► raw text (unpdf for PDF, ExcelJS for spreadsheets,
         │       fs.readFile for markdown)
         ▼
   chunk.ts  ──► chunks (chars, not tokens — sliding window
         │       with overlap, defaults: 1200 / 200)
         ▼
   embed.ts  ──► vector (Gemini embedding-001 → 768d
         │                OR OpenAI text-embedding-3-small → 1536d)
         ▼
   ingest.ts ──► KnowledgeChunk rows in Mongo
         │       (text + embedding + documentId + chunkIndex + sha256)
         ▼
        ───
         │   (at chat time)
         ▼
   search.ts ──► keyword score with importance weights,
         │       optional topic-preference boost,
         │       tier filter, top-K return
         ▼
   chat.ts   ──► sources embedded in system prompt,
         │       streamed completion from active ChatProvider
         ▼
   /api/chat ─► NDJSON to the browser
```

## What gets indexed

Two sources, indexed the same way:

1. **Drive documents** — anything synced by `syncFromDrive()`. PDFs and spreadsheets are text-extracted; non-extractable formats (images, video) are listed in `documents` but excluded from `knowledgechunks`.
2. **`localKnowledge` entries** — markdown files declared in `dataroom.config.ts`. Lighthouse Labs uses this for everything; Acme and Greenwood use it for nothing.

The two sources share one collection. Citations distinguish them by `documentId === null` for local sources.

## Re-ingest semantics (SHA-256 dedup)

`ingest.ts` does the right thing on re-runs:

- **First-time file**: chunk + embed + insert + stamp `contentHash` on the parent Document.
- **Unchanged file** (`sha256(text) === contentHash`): skip entirely. No re-embed, no DB writes.
- **Changed file**: wipe existing chunks for that `documentId`, re-chunk, re-embed, re-insert, update `contentHash`.

The unique compound index on `(documentId, chunkIndex)` prevents duplicate-chunk races if two re-ingests run concurrently — the second insert hits the unique constraint and the route returns a 409-equivalent in the response.

Return shape: `{ processed, skipped, refreshed, totalChunks, errors }`. The admin "Re-index knowledge base" button surfaces these counts in a toast.

## Retrieval is keyword-only

`search.ts` scores each chunk by:

```
score = keyword_match_count
      * config.documents.importanceWeights[category] ?? 1.0
      * topic_preference_bonus  // small additive boost if user's inferred topic matches
```

then sorts and returns top-`config.technical.retrievalTopK` chunks.

There is no semantic search today. **Embeddings are computed and stored, but never queried.** Two reasons:

1. The original codebase shipped keyword-only and we kept the behaviour for predictability through the OSS transition.
2. Atlas Vector Search requires either an M10+ paid cluster or Atlas-hosted Vector Search (also paid). We didn't want the template's default path to require paid infra.

## Why store embeddings if they're not queried?

Future-proofing. The day someone wants vector search, the chunks are ready — no re-ingest required. See the swap recipe below.

It's a real cost: each re-index spends Gemini/OpenAI embedding tokens to compute vectors that get written and never read. For forks that are confident they'll never want vector search, you can short-circuit the embedding call in `embed.ts` to return an empty array. (PR welcome to make this configurable.)

## Embeddings dimension trap

`config.ai.embeddingsProvider` accepts `"gemini"` (768d) or `"openai"` (1536d). Switching providers without wiping chunks will leave you with a mixed-dimension collection. Today this is **dormant** — keyword scorer doesn't touch the vectors. But the day vector search ships, mixed-dim chunks will corrupt the index.

**Safe migration:**

```bash
# 1. In admin UI, click "Wipe knowledge base"  (or: mongo > db.knowledgechunks.deleteMany({}))
# 2. Edit dataroom.config.ts → switch embeddingsProvider
# 3. Restart server
# 4. In admin UI, click "Re-index knowledge base"
```

The right long-term fix (when vector search lands) is to stamp `KnowledgeChunk.embeddingsModel` per row and refuse to query across model boundaries. The cheap fix today is this README warning + the wipe-and-re-ingest button.

## The `needsRAG()` fast path

`chat.ts` runs `needsRAG(userMessage)` before retrieval. The check has two parts:

1. **Exact-match** against `config.chatbot.greetingPatterns` (after lowercasing and stripping trailing `!.,?`). A normalised "hi!" equals `"hi"` → skip RAG.
2. **Hardcoded fallback:** any message of ≤2 words without a `?` skips RAG regardless of the patterns list. This catches "hello there", "thanks", "ok cool" — social phrases the patterns list won't anticipate.

Either branch skips retrieval: no `searchChunks` call, no source assembly, no token spend on context.

This was an invisible heuristic in the original codebase. The OSS refactor made the pattern list a config field so forks can tune *additions* per audience, but the ≤2-words-no-? fallback stays hardcoded — emptying `greetingPatterns` does NOT force RAG on every message. To turn the fallback off, edit `src/lib/chat.ts`.

## History-augmented search query

When the user asks a follow-up ("and what about the team?"), keyword search against just the new message returns nothing useful. `chat.ts` finds the **most recent prior user message** (skipping assistant turns), takes its first **200 characters**, and prepends them to the new query — but only if that prior message is longer than 10 characters. So "and what about the team?" actually searches as something like "...funding history and what about the team?".

Single-turn lookups (no history) skip the augmentation entirely. The 200-char cap matters: the keyword scorer runs a regex per keyword against every chunk, so a 5KB pasted block would be catastrophic. 200 was empirically the sweet spot; longer queries silently degraded relevance.

## Tier filtering

`searchChunks(query, topK, tier)` filters at the DB layer using **array-membership** against a `tiers: string[]` field on each chunk:

```js
const filter = {};
if (tier) filter.tiers = tier;        // Mongo: { tiers: "growth" } matches { tiers: ["growth", "seed"] }
const allChunks = await KnowledgeChunk.find(filter).lean();
```

The chunk's `tiers` array is set at ingest time from the parent Document's `tiers` (which `sync.ts` writes from Drive folder structure — a doc in `Shared/` gets every tier id, a doc in `growth/X/` gets `["growth"]`).

**No-tier mode** (empty `config.access.tiers`) means `tier` is undefined at the call site, the filter stays empty, and every chunk returns. Tier-less investors in a *multi-tier* deployment never reach this code — the route 403s them first.

**Local-knowledge caveat:** `ingest-local.ts` writes localKnowledge chunks without populating `tiers`. In a no-tier deployment they surface fine. In a multi-tier deployment they will **not** match any tier-filtered query — so a Lighthouse-style "everything is markdown" config that adds tiers later strands its localKnowledge from chat. If you mix the two, set `tiers` explicitly in `ingest-local.ts` (PR welcome to make this configurable).

**Cross-tier leakage check:** integration tests would be nice here (PR welcome). The current defence is the unconditional filter plus the route's 403 guard on tier-less investors.

## Citation format

The chat stream emits citations in the first `sources` chunk:

```json
{ "type": "sources", "sources": [
  { "id": "...", "title": "Pitch Deck.pdf", "category": "pitch-deck", "chunkIndex": 3 },
  { "id": null,  "title": "About the founder", "category": "about",   "chunkIndex": 0 }
] }
```

The system prompt embeds these as `[1]`, `[2]` references; the persona guard rails instruct the model to cite inline. The UI renders the sources strip below the model's response, with clickable links to the source document where possible (Drive docs get a viewer link, local sources get an in-page anchor).

## Swap to vector search (Atlas Vector Search)

About 30 minutes of work. Recipe:

1. **Add a vector index** on `knowledgechunks.embedding` in Atlas (UI: Database → Collections → knowledgechunks → Search Indexes). Use `cosine` similarity with the right dimensions (768 for Gemini, 1536 for OpenAI).

2. **Wipe and re-ingest** so every chunk has a vector with the same dim. (Skip if you've never switched providers.)

3. **Replace `searchChunks` in `src/lib/rag/search.ts`**:

   ```ts
   import { embedQuery } from "./embed";
   
   export async function searchChunks(query: string, topK = 8, tier?: string) {
     const queryVector = await embedQuery(query);
     const filter: Record<string, unknown> = {};
     if (tier) filter.tiers = tier;
   
     return KnowledgeChunk.aggregate([
       {
         $vectorSearch: {
           index: "vector_index",          // your Atlas Search index name
           path: "embedding",
           queryVector,
           numCandidates: topK * 10,
           limit: topK,
           filter,
         },
       },
     ]);
   }
   ```

4. **Drop `importanceWeights`** from `config.documents` if you don't want them anymore, or keep the keyword scorer as a hybrid rerank stage (multiply vector score by importance weight at the end).

5. **Test on a sample query.** Vector search returns semantically similar chunks; keyword returns exact-match chunks. The two behaviours feel different to investors — pick the one that fits your content.

That's it. No other code changes required.

## Swap to a non-Mongo vector store

If you're going to break the Mongo monogamy, the right interface to refactor is `searchChunks` and `ingest.ts`. Both currently call Mongoose directly; you'd extract them to a `VectorStore` interface with `upsert(chunks)` and `query(vector, topK, filter)` methods, then implement that interface for Pinecone / Weaviate / Qdrant / pgvector.

The catch: you still need Mongo for `users`, `invites`, etc. So you'd be operating two stores. For a template at this scale, Mongo + Atlas Vector is the sweet spot.

## Hard limits

- **`retrievalTopK`** above ~10 makes prompts long enough to start exceeding free-tier model context limits. Don't go there without checking your model's window.
- **`chunkSize`** above ~2000 chars + `retrievalTopK: 5` = ~10k chars of context per turn before the user's actual message. Fine for Gemini Pro, tight for smaller models.
- **Re-indexing the whole knowledge base** is rate-limited by your embeddings provider. Gemini free tier rate-limits at ~60 embed calls/minute; OpenAI is more permissive. A 200-document re-index can take several minutes on Gemini free — leave the admin button alone while it runs.
