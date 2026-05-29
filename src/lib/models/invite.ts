import mongoose, { Schema, type Document } from "mongoose";

export interface IInvite extends Document {
    email: string;
    name?: string;
    token: string;
    status: "pending" | "accepted" | "expired";
    /**
     * Tier id from `config.access.tiers[].id`. No schema-level enum — the
     * valid set lives in config and is enforced at the API write paths.
     */
    tier?: string;
    invitedBy: string;
    sentAt: Date;
    acceptedAt?: Date;
    expiresAt: Date;
    createdAt: Date;
}

const inviteSchema = new Schema<IInvite>(
    {
        email: { type: String, required: true, lowercase: true, trim: true },
        name: { type: String, trim: true },
        token: { type: String, required: true, unique: true },
        status: { type: String, enum: ["pending", "accepted", "expired"], default: "pending" },
        tier: { type: String },
        invitedBy: { type: String, required: true },
        sentAt: { type: Date, default: Date.now },
        acceptedAt: { type: Date },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

inviteSchema.index({ token: 1 });
inviteSchema.index({ email: 1 });
inviteSchema.index({ status: 1 });

export const Invite = mongoose.models.Invite || mongoose.model<IInvite>("Invite", inviteSchema);
