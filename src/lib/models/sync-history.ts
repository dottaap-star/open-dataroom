import mongoose, { Schema, type Document } from "mongoose";

export interface ISyncHistory extends Document {
    triggeredBy: "manual" | "auto" | "webhook";
    filesAdded: number;
    filesUpdated: number;
    filesRemoved: number;
    status: "running" | "success" | "partial" | "failed";
    errorMessage?: string;
    details: string[];
    startedAt: Date;
    completedAt?: Date;
}

const syncHistorySchema = new Schema<ISyncHistory>({
    triggeredBy: { type: String, enum: ["manual", "auto", "webhook"], required: true },
    filesAdded: { type: Number, default: 0 },
    filesUpdated: { type: Number, default: 0 },
    filesRemoved: { type: Number, default: 0 },
    status: { type: String, enum: ["running", "success", "partial", "failed"], default: "running" },
    errorMessage: { type: String },
    details: [{ type: String }],
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
});

syncHistorySchema.index({ startedAt: -1 });

export const SyncHistory =
    mongoose.models.SyncHistory || mongoose.model<ISyncHistory>("SyncHistory", syncHistorySchema);
