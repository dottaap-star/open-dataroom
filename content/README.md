# content/

Local knowledge sources for the RAG chatbot. Markdown / plain text files
in this directory are checked in alongside the code and ingested into
MongoDB when an admin hits **Re-index knowledge base** on the dashboard.

The contents are NOT a replacement for the Drive-synced documents — those
are still the primary source of truth, and this directory is for things
that don't fit there: an about-the-company writeup, a product overview, a
"who we are" page, an FAQ. Anything you'd rather edit in your code editor
than upload to Drive.

## How it's wired

Each file you want ingested must be declared in `dataroom.config.ts`:

```ts
localKnowledge: [
  {
    path: "content/company-overview.md",
    title: "Company Overview",        // shown as the citation
    category: "business-plan",        // for importance weighting
  },
],
```

The reader uses `path` relative to the repo root.

## Refresh semantics

Re-running ingest computes a SHA-256 of each file's content. If the hash
matches the stored one (kept on the first chunk's `localContentHash`
field), the file is skipped. If the hash differs (you edited the file),
the old chunks are wiped and the file is re-chunked + re-inserted. So you
can edit and re-ingest freely without piling up duplicates.

## What ships out of the box

This directory ships empty in the default `dataroom.config.ts` — see
`examples/lighthouse-labs/` for the canonical localKnowledge-driven
deployment (Lighthouse leans on this rather than Drive).
