import mongoose, { Schema, type Document } from "mongoose";

export interface IUser extends Document {
    email: string;
    passwordHash: string;
    name: string;
    role: "investor" | "admin";
    /**
     * Tier id from `config.access.tiers[].id`. No schema-level enum — the
     * set of valid tiers comes from config and is enforced at API write
     * paths (`POST/PATCH /api/admin/invites`, signup). Free-text here keeps
     * the model decoupled from any one tenant's tier list.
     */
    tier?: string;
    isActive: boolean;
    /**
     * Monotonic counter bumped to invalidate every outstanding JWT for
     * this user. Compared against `payload.tokenVersion` on every
     * authenticated request and refresh attempt — mismatch ⇒ 401.
     *
     * Bumped by: `POST /api/admin/users/[id]/revoke` (admin kills access),
     * and `POST /api/auth/logout` (the user signs out — also invalidates
     * the refresh token server-side, not just the cookie).
     *
     * Existing pre-Phase-4.5 user rows have no field at all; auth.ts uses
     * `?? 0` coercion both sides so undefined-vs-undefined passes and
     * tampered tokens fail.
     */
    tokenVersion: number;
    inviteToken?: string;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        name: { type: String, required: true, trim: true },
        role: { type: String, enum: ["investor", "admin"], default: "investor" },
        tier: { type: String },
        isActive: { type: Boolean, default: true },
        tokenVersion: { type: Number, default: 0 },
        inviteToken: { type: String },
        lastLogin: { type: Date },
    },
    { timestamps: true }
);

userSchema.index({ role: 1 });

export const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
