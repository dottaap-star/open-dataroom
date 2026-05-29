import mongoose, { Schema, type Document } from "mongoose";

export interface IAccessLog extends Document {
    userId: mongoose.Types.ObjectId;
    userName: string;
    userEmail: string;
    action:
        | "login"
        | "view_document"
        | "download_document"
        | "chat_message"
        | "page_view"
        | "admin_revoke"
        | "admin_restore";
    resourceId?: string;
    resourceType?: string;
    resourceName?: string;
    metadata?: Record<string, unknown>;
    ip: string;
    location?: string;
    country?: string;
    userAgent: string;
    timestamp: Date;
}

const accessLogSchema = new Schema<IAccessLog>({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    action: {
        type: String,
        enum: [
            "login",
            "view_document",
            "download_document",
            "chat_message",
            "page_view",
            "admin_revoke",
            "admin_restore",
        ],
        required: true,
    },
    resourceId: { type: String },
    resourceType: { type: String },
    resourceName: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ip: { type: String, default: "unknown" },
    location: { type: String },
    country: { type: String },
    userAgent: { type: String, default: "unknown" },
    timestamp: { type: Date, default: Date.now },
});

accessLogSchema.index({ userId: 1 });
accessLogSchema.index({ action: 1 });
accessLogSchema.index({ timestamp: -1 });

export const AccessLog = mongoose.models.AccessLog || mongoose.model<IAccessLog>("AccessLog", accessLogSchema);
