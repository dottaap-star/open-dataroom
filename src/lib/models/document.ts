import mongoose, { Schema, type Document as MongoDocument } from "mongoose";

export interface IDocument extends MongoDocument {
    driveFileId: string;
    title: string;
    description?: string;
    category: string;
    mimeType: string;
    originalMimeType: string;
    sizeBytes: number;
    s3Key: string;
    pageCount?: number;
    driveModifiedAt: Date;
    lastSyncedAt: Date;
    isActive: boolean;
    sortOrder: number;
    viewCount: number;
    tiers: string[];
    allowDownload: boolean;
    /**
     * SHA-256 of the extracted plain text at the last successful ingest.
     * Used by `src/lib/rag/ingest.ts` to detect content changes that the
     * Drive metadata (modifiedAt) doesn't catch — re-rendered exports
     * with stable bytes get skipped; same title with new content forces
     * a chunk wipe + re-insert. Missing on docs that pre-date Phase 5.
     */
    contentHash?: string;
    createdAt: Date;
    updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
    {
        driveFileId: { type: String, required: true, unique: true },
        title: { type: String, required: true },
        description: { type: String },
        category: { type: String, required: true },
        mimeType: { type: String, required: true },
        originalMimeType: { type: String, required: true },
        sizeBytes: { type: Number, default: 0 },
        s3Key: { type: String, default: "" },
        pageCount: { type: Number },
        driveModifiedAt: { type: Date, required: true },
        lastSyncedAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
        viewCount: { type: Number, default: 0 },
        tiers: { type: [String], default: [] },
        allowDownload: { type: Boolean, default: false },
        contentHash: { type: String },
    },
    { timestamps: true }
);

documentSchema.index({ category: 1 });
documentSchema.index({ isActive: 1 });

export const DocumentModel =
    mongoose.models.Document || mongoose.model<IDocument>("Document", documentSchema);
