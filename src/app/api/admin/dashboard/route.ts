import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { AccessLog } from "@/lib/models/access-log";
import { DocumentModel } from "@/lib/models/document";
import { SyncHistory } from "@/lib/models/sync-history";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
    try {
        await requireAdmin();
        await connectDB();

        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [
            totalInvestors,
            activeThisWeek,
            docViews,
            chatMessages,
            totalDocuments,
            lastSync,
            recentActivity,
        ] = await Promise.all([
            User.countDocuments({ role: "investor", isActive: true }),
            AccessLog.distinct("userId", { action: "login", timestamp: { $gte: oneWeekAgo } }).then((ids) => ids.length),
            AccessLog.countDocuments({ action: "view_document" }),
            AccessLog.countDocuments({ action: "chat_message" }),
            DocumentModel.countDocuments({ isActive: true }),
            SyncHistory.findOne().sort({ startedAt: -1 }).lean(),
            AccessLog.find().sort({ timestamp: -1 }).limit(10).lean(),
        ]);

        return NextResponse.json({
            metrics: {
                totalInvestors,
                activeThisWeek,
                docViews,
                chatMessages,
                totalDocuments,
            },
            lastSync: lastSync ? {
                status: lastSync.status,
                startedAt: lastSync.startedAt,
                filesAdded: lastSync.filesAdded,
                filesUpdated: lastSync.filesUpdated,
            } : null,
            recentActivity,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message.includes("Unauthorized") ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
