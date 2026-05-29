import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DocumentModel } from "@/lib/models/document";
import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { config } from "@/config";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const validTierIds = config.access.tiers.map((t) => t.id);
        const query: Record<string, unknown> = { isActive: true };

        // No-tier mode (config.access.tiers === []) skips all tier filtering
        // entirely — every logged-in investor sees every active document.
        if (validTierIds.length > 0) {
            if (user.role === "investor") {
                if (!user.tier) {
                    // Legacy-migration footgun: an investor row with no tier in
                    // multi-tier mode would skip the filter below and see every
                    // document. Fail loud instead — admin needs to PATCH a tier
                    // on this user (or downgrade the deployment to no-tier mode).
                    return NextResponse.json(
                        { error: "Your account has no access tier assigned. Please contact the admin." },
                        { status: 403 },
                    );
                }
                query.tiers = user.tier;
            } else if (user.role === "admin") {
                // Admin preview mode: check for preview_tier cookie. Only honour
                // it if the value matches a currently-configured tier id (stops
                // stale cookies from previous tier names leaking through).
                const cookieStore = await cookies();
                const previewTier = cookieStore.get("preview_tier")?.value;
                if (previewTier && validTierIds.includes(previewTier)) {
                    query.tiers = previewTier;
                }
            }
        }

        const documents = await DocumentModel.find(query)
            .sort({ category: 1, sortOrder: 1, title: 1 })
            .lean();

        // Group by category
        const grouped: Record<string, typeof documents> = {};
        for (const doc of documents) {
            if (!grouped[doc.category]) {
                grouped[doc.category] = [];
            }
            grouped[doc.category].push(doc);
        }

        return NextResponse.json({ documents, grouped });
    } catch (err) {
        console.error("Documents fetch error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
