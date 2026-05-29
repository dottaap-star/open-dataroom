import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { AccessLog } from "@/lib/models/access-log";
import { requireAdmin } from "@/lib/auth";

/**
 * Re-enables a previously-revoked investor.
 *
 * Sets `isActive: true` so login is accepted again. Does NOT decrement
 * `tokenVersion` — the user must log in fresh with email + password.
 * Stale pre-revoke tokens stay invalid forever, by design (otherwise
 * restore would resurrect a stolen token's lifetime alongside the user).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const admin = await requireAdmin();
        const { id } = await params;

        await connectDB();

        const user = await User.findByIdAndUpdate(
            id,
            { $set: { isActive: true } },
            { new: true },
        );

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        await AccessLog.create({
            userId: admin._id,
            userName: admin.name,
            userEmail: admin.email,
            action: "admin_restore",
            resourceId: user._id.toString(),
            resourceType: "user",
            resourceName: user.email,
            metadata: { restoredUserEmail: user.email, restoredUserName: user.name },
        });

        return NextResponse.json({
            message: `Restored access for ${user.email}`,
            user: { _id: user._id, email: user.email, isActive: user.isActive },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message.includes("Unauthorized") ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
