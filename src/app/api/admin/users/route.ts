import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { requireAdmin } from "@/lib/auth";

/**
 * Lists investor users (admins excluded). Used by the admin invites page
 * to join account state (isActive / lastLogin / userId for revoke+restore)
 * onto the per-invite rows.
 */
export async function GET() {
    try {
        await requireAdmin();
        await connectDB();

        const users = await User.find({ role: "investor" })
            .select("_id email name tier isActive lastLogin createdAt")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ users });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message.includes("Unauthorized") ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
