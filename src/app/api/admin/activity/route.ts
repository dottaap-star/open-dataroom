import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AccessLog } from "@/lib/models/access-log";
import { User } from "@/lib/models/user";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        await requireAdmin();
        await connectDB();

        const { searchParams } = new URL(request.url);
        const action = searchParams.get("action");
        const userEmail = searchParams.get("userEmail");
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");
        const resource = searchParams.get("resource");

        // Build filter
        const filter: Record<string, unknown> = {};
        if (action) filter.action = action;
        if (userEmail) filter.userEmail = userEmail;
        if (resource) {
            const escaped = resource.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.resourceName = { $regex: escaped, $options: "i" };
        }
        if (dateFrom || dateTo) {
            filter.timestamp = {};
            if (dateFrom) (filter.timestamp as Record<string, Date>).$gte = new Date(dateFrom);
            if (dateTo) {
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
                (filter.timestamp as Record<string, Date>).$lte = end;
            }
        }

        const logs = await AccessLog.find(filter).sort({ timestamp: -1 }).limit(500).lean();

        // Also return unique investors for the filter dropdown
        const investors = await User.find({ role: "investor", isActive: true })
            .select("email name")
            .sort({ name: 1 })
            .lean();

        return NextResponse.json({ logs, investors });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message.includes("Unauthorized") ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
