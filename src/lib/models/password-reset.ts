import mongoose, { Schema, type Document } from "mongoose";

export interface IPasswordReset extends Document {
    userId: mongoose.Types.ObjectId;
    token: string;
    expiresAt: Date;
    used: boolean;
    createdAt: Date;
}

const passwordResetSchema = new Schema<IPasswordReset>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        token: { type: String, required: true, unique: true }, // Stored as SHA-256 hash
        expiresAt: { type: Date, required: true },
        used: { type: Boolean, default: false },
    },
    { timestamps: true }
);

passwordResetSchema.index({ token: 1 });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset =
    mongoose.models.PasswordReset || mongoose.model<IPasswordReset>("PasswordReset", passwordResetSchema);
