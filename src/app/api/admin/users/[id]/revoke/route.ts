import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { AccessLog } from "@/lib/models/access-log";
import { requireAdmin } from "@/lib/auth";

/**
 * Cuts an investor's access immediately.
 *
 * Mechanics: bumps `user.tokenVersion` so every outstanding JWT
 * (access + refresh) fails the version check on next use. Also sets
 * `isActive: false` so the login form rejects them even if they try
 * with valid credentials. The user has to be Restored AND log in
 * fresh to get a new session.
 *
 * Admins can't revoke themselves — they should use the logout endpoint
 * (which also bumps tokenVersion) instead.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const admin = await requireAdmin();
        const { id } = await params;

        if (admin._id.toString() === id) {
            return NextResponse.json(
                { error: "You can't revoke yourself — use logout instead." },
                { status: 400 },
            );
        }

        await connectDB();

        const user = await User.findByIdAndUpdate(
            id,
            { $inc: { tokenVersion: 1 }, $set: { isActive: false } },
            { new: true },
        );

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        await AccessLog.create({
            userId: admin._id,
            userName: admin.name,
            userEmail: admin.email,
            action: "admin_revoke",
            resourceId: user._id.toString(),
            resourceType: "user",
            resourceName: user.email,
            metadata: { revokedUserEmail: user.email, revokedUserName: user.name },
        });

        return NextResponse.json({
            message: `Revoked access for ${user.email}`,
            user: { _id: user._id, email: user.email, isActive: user.isActive },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message.includes("Unauthorized") ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
