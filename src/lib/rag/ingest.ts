import crypto from "node:crypto";
import { connectDB } from "../db";
import { DocumentModel } from "../models/document";
import { KnowledgeChunk } from "../models/knowledge-chunk";
import { extractText } from "./extract";
import { chunkText } from "./chunk";

/**
 * Ingest all active documents into the knowledge base.
 *
 * Per-doc decision tree:
 *   1. extractText → empty / too short → skipped++.
 *   2. SHA-256 the extracted text.
 *   3. If the doc already has chunks AND its stored contentHash matches →
 *      skipped++ (already up-to-date).
 *   4. If chunks exist with a different (or missing) contentHash → DELETE
 *      the doc's chunks, re-chunk, re-insert. This is the bug-fix path:
 *      the original code (`countDocuments > 0 ⇒ skip`) meant a Drive doc
 *      updated post-first-ingest would never have its chunks refreshed, so
 *      the bot would silently cite stale info forever.
 *   5. If no chunks yet → chunk + insert (normal first-time path).
 *
 * Concurrent runs are made idempotent by the partial unique index on
 * `KnowledgeChunk.(documentId, chunkIndex)` — if a racing run inserts the
 * same chunk first, the second insertMany fails on duplicates and we
 * record the error rather than corrupting the index.
 */
export async function ingestDocuments() {
    await connectDB();

    const documents = await DocumentModel.find({ isActive: true }).lean();

    let totalChunks = 0;
    let processed = 0;
    let skipped = 0;
    let refreshed = 0;
    const errors: string[] = [];

    for (const doc of documents) {
        try {
            // Video files have no extractable text.
            if (doc.mimeType.startsWith("video/") || doc.originalMimeType.startsWith("video/")) {
                skipped++;
                continue;
            }

            const text = await extractText(doc.driveFileId, doc.originalMimeType);
            if (!text || text.trim().length < 50) {
                skipped++;
                continue;
            }

            const contentHash = crypto.createHash("sha256").update(text).digest("hex");
            const existingChunkCount = await KnowledgeChunk.countDocuments({ documentId: doc._id });

            if (existingChunkCount > 0 && doc.contentHash === contentHash) {
                skipped++;
                continue;
            }

            // Either first-time (no chunks) or content drifted (different hash):
            // wipe-then-reinsert to keep the chunk set canonical.
            if (existingChunkCount > 0) {
                await KnowledgeChunk.deleteMany({ documentId: doc._id });
            }

            const tierLabel = (doc.tiers || []).join(", ") || "no-tier";
            console.log(`Ingesting: ${doc.title} [${tierLabel}]${existingChunkCount > 0 ? " (content drift)" : ""}`);

            const chunks = chunkText(text);
            console.log(`  ${chunks.length} chunks`);

            const chunkDocs = chunks.map((chunk) => ({
                documentId: doc._id,
                documentTitle: doc.title,
                category: doc.category,
                content: chunk.content,
                chunkIndex: chunk.chunkIndex,
                pageNumber: chunk.pageNumber,
                tiers: doc.tiers || [],
                embedding: [],
            }));

            await KnowledgeChunk.insertMany(chunkDocs);

            // Stamp the new hash on the Document row so the next sync run
            // can compare against it.
            await DocumentModel.findByIdAndUpdate(doc._id, { contentHash });

            totalChunks += chunks.length;
            if (existingChunkCount > 0) refreshed++;
            processed++;
            console.log(`  Done: ${chunks.length} chunks stored`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`  Error ingesting ${doc.title}:`, msg);
            errors.push(`${doc.title}: ${msg}`);
        }
    }

    return { processed, skipped, refreshed, totalChunks, errors };
}
