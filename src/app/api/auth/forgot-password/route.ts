import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { PasswordReset } from "@/lib/models/password-reset";
import { generateToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        await connectDB();

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        // Always return success to prevent email enumeration
        if (!user) {
            return NextResponse.json({ message: "If the email exists, a reset link has been sent" });
        }

        // Create reset token (1 hour expiry) - store hash, send raw token
        const token = generateToken();
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        await PasswordReset.create({
            userId: user._id,
            token: tokenHash,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });

        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002"}/reset-password/${token}`;

        // Send reset email
        try {
            await sendPasswordResetEmail(email, resetUrl);
            console.log(`Password reset email sent to ${email}`);
        } catch (emailErr) {
            console.error("Failed to send reset email:", emailErr);
        }

        return NextResponse.json({ message: "If the email exists, a reset link has been sent" });
    } catch (err) {
        console.error("Forgot password error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
