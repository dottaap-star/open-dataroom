import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { connectDB } from "../db";
import { KnowledgeChunk } from "../models/knowledge-chunk";
import { chunkText } from "./chunk";
import { config } from "@/config";
import type { LocalKnowledgeSource } from "../config-types";

/**
 * Ingest local markdown/text files into the knowledge base.
 *
 * Sources come from `config.localKnowledge` — typically curated
 * about-the-company / about-the-product writeups checked into the repo
 * under `content/`. Each source has a path relative to the repo root, a
 * display title (used as the citation), and a category slug (drives the
 * importance weight in `search.ts`).
 *
 * Re-ingest semantics mirror the Drive-document path: content-hash check
 * via the title (since local files don't have a documentId). If the hash
 * matches an existing chunk's stored hash, skip. Mismatch ⇒ wipe by title
 * + re-insert. Stored on the first chunk's `localContentHash` field below.
 */

interface ChunkWithHash {
    documentId: null;
    documentTitle: string;
    category: string;
    content: string;
    chunkIndex: number;
    tiers: never[];
    embedding: number[];
    localContentHash?: string;
}

export async function ingestLocalFiles(sources: LocalKnowledgeSource[] = config.localKnowledge) {
    await connectDB();

    let totalChunks = 0;
    let processed = 0;
    let refreshed = 0;
    const errors: string[] = [];

    for (const source of sources) {
        try {
            const absolutePath = path.resolve(process.cwd(), source.path);
            if (!fs.existsSync(absolutePath)) {
                errors.push(`${source.title}: file not found at ${source.path}`);
                continue;
            }

            const text = fs.readFileSync(absolutePath, "utf-8");
            if (text.trim().length < 50) {
                continue;
            }

            const contentHash = crypto.createHash("sha256").update(text).digest("hex");

            // localContentHash is stamped only on the first chunk of each source
            // (chunkIndex: 0) — saves storing it on every chunk row.
            const existingFirstChunk = await KnowledgeChunk.findOne({
                documentTitle: source.title,
                documentId: null,
                chunkIndex: 0,
            }).lean();
            const existing = existingFirstChunk as (ChunkWithHash & { _id: unknown }) | null;

            if (existing && existing.localContentHash === contentHash) {
                continue;
            }

            if (existing) {
                await KnowledgeChunk.deleteMany({ documentTitle: source.title, documentId: null });
            }

            const chunks = chunkText(text);
            const chunkDocs: ChunkWithHash[] = chunks.map((chunk, i) => ({
                documentId: null,
                documentTitle: source.title,
                category: source.category,
                content: chunk.content,
                chunkIndex: chunk.chunkIndex,
                tiers: [],
                embedding: [],
                // Stamp the hash on chunkIndex 0 only.
                ...(i === 0 ? { localContentHash: contentHash } : {}),
            }));

            await KnowledgeChunk.insertMany(chunkDocs);
            totalChunks += chunks.length;
            if (existing) refreshed++;
            processed++;
            console.log(`Ingested local: ${source.title} (${chunks.length} chunks)${existing ? " (refreshed)" : ""}`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`${source.title}: ${msg}`);
        }
    }

    return { processed, refreshed, totalChunks, errors };
}
