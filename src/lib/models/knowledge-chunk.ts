import mongoose, { Schema, type Document } from "mongoose";

export interface IKnowledgeChunk extends Document {
    documentId: mongoose.Types.ObjectId | null;
    documentTitle: string;
    category: string;
    content: string;
    chunkIndex: number;
    pageNumber?: number;
    tiers: string[];
    embedding: number[];
    /**
     * SHA-256 of the source file content, stamped on chunkIndex 0 only,
     * for local-source ingest. The Drive-doc re-ingest path tracks this
     * on `Document.contentHash` instead — that's the canonical place;
     * locals have no Document row so we keep it on the first chunk.
     */
    localContentHash?: string;
    createdAt: Date;
}

const knowledgeChunkSchema = new Schema<IKnowledgeChunk>(
    {
        documentId: { type: Schema.Types.ObjectId, ref: "Document" },
        documentTitle: { type: String, required: true },
        category: { type: String, required: true },
        content: { type: String, required: true },
        chunkIndex: { type: Number, required: true },
        pageNumber: { type: Number },
        tiers: { type: [String], default: [] },
        embedding: { type: [Number], required: true },
        localContentHash: { type: String },
    },
    { timestamps: true }
);

knowledgeChunkSchema.index({ documentId: 1 });
knowledgeChunkSchema.index({ tiers: 1 });
knowledgeChunkSchema.index({ content: "text", documentTitle: "text" });
// Concurrent-re-ingest safety: when ingest.ts deletes-then-re-inserts a
// document's chunks, two racing runs could otherwise double-insert. Partial
// filter restricts the constraint to Drive-sourced chunks (documentId is an
// ObjectId); local-file chunks have documentId: null and don't participate.
knowledgeChunkSchema.index(
    { documentId: 1, chunkIndex: 1 },
    { unique: true, partialFilterExpression: { documentId: { $type: "objectId" } } },
);

export const KnowledgeChunk =
    mongoose.models.KnowledgeChunk || mongoose.model<IKnowledgeChunk>("KnowledgeChunk", knowledgeChunkSchema);
