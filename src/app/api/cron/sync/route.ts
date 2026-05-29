import { NextResponse } from "next/server";
import { syncFromDrive } from "@/lib/sync";
import crypto from "crypto";

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Always require cron secret - never allow unauthenticated access
    if (!cronSecret || !authHeader) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Constant-time comparison to prevent timing attacks
    const expected = Buffer.from(`Bearer ${cronSecret}`);
    const provided = Buffer.from(authHeader);
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await syncFromDrive("auto");
        return NextResponse.json({ message: "Auto-sync completed", ...result });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Sync failed";
        console.error("Cron sync error:", message);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
