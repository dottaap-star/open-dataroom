import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { PasswordReset } from "@/lib/models/password-reset";
import { hashPassword } from "@/lib/auth";
import crypto from "crypto";

export async function POST(request: Request) {
    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        }

        await connectDB();

        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const resetRecord = await PasswordReset.findOne({ token: tokenHash, used: false });

        if (!resetRecord) {
            return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
        }

        if (new Date() > resetRecord.expiresAt) {
            return NextResponse.json({ error: "Reset link has expired" }, { status: 400 });
        }

        // Update password
        const passwordHash = await hashPassword(password);
        await User.findByIdAndUpdate(resetRecord.userId, { passwordHash });

        // Mark token as used
        resetRecord.used = true;
        await resetRecord.save();

        return NextResponse.json({ message: "Password reset successfully" });
    } catch (err) {
        console.error("Reset password error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
