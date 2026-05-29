import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { syncFromDrive } from "@/lib/sync";
import { connectDB } from "@/lib/db";
import { SyncHistory } from "@/lib/models/sync-history";

export async function POST() {
    try {
        await requireAdmin();

        const result = await syncFromDrive("manual");

        return NextResponse.json({
            message: "Sync completed",
            ...result,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message.includes("Unauthorized") ? 403 : message.includes("not configured") ? 400 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function GET() {
    try {
        await requireAdmin();
        await connectDB();

        const history = await SyncHistory.find().sort({ startedAt: -1 }).limit(20).lean();

        return NextResponse.json({ history });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message.includes("Unauthorized") ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
