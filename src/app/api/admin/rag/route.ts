import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ingestDocuments } from "@/lib/rag/ingest";
import { ingestLocalFiles } from "@/lib/rag/ingest-local";
import { connectDB } from "@/lib/db";
import { KnowledgeChunk } from "@/lib/models/knowledge-chunk";
import { AccessLog } from "@/lib/models/access-log";
import { config } from "@/config";

/**
 * POST /api/admin/rag — Trigger full RAG ingestion (Drive docs + local knowledge files)
 */
export async function POST() {
    try {
        await requireAdmin();

        // 1. Ingest Drive documents (content-hash gated; see ingest.ts).
        console.log("=== Ingesting Drive documents ===");
        const driveResult = await ingestDocuments();

        // 2. Ingest local knowledge files declared in config.localKnowledge.
        // Pass no argument to use the configured set; explicit array is fine
        // too if a forker wants to ingest something else from a custom route.
        console.log("=== Ingesting local knowledge ===");
        const localResult = await ingestLocalFiles();

        return NextResponse.json({
            message: "RAG ingestion complete",
            drive: driveResult,
            local: localResult,
            totalChunks: driveResult.totalChunks + localResult.totalChunks,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Ingestion failed";
        const status = message.includes("Unauthorized") ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

/**
 * GET /api/admin/rag — Get RAG status with tier breakdown
 */
export async function GET() {
    try {
        await requireAdmin();
        await connectDB();

        const totalChunks = await KnowledgeChunk.countDocuments();

        // Documents with chunk counts
        const byDocument = await KnowledgeChunk.aggregate([
            {
                $group: {
                    _id: "$documentTitle",
                    count: { $sum: 1 },
                    category: { $first: "$category" },
                    tiers: { $first: "$tiers" },
                },
            },
            { $sort: { category: 1, _id: 1 } },
        ]);

        // Chunks per tier
        const tierCounts: Record<string, number> = {};
        for (const doc of byDocument) {
            const tiers = doc.tiers || [];
            for (const tier of tiers) {
                tierCounts[tier] = (tierCounts[tier] || 0) + doc.count;
            }
        }

        // Shared count (docs with all 3 tiers)
        const sharedChunks = byDocument
            .filter((d) => (d.tiers || []).length >= 3)
            .reduce((sum: number, d: { count: number }) => sum + d.count, 0);

        // Most cited sources from chat logs
        const chatLogs = await AccessLog.find({
            action: "chat_message",
            "metadata.sourcesCited": { $exists: true, $ne: [] },
        }).lean();

        const citationCounts: Record<string, number> = {};
        for (const log of chatLogs) {
            const sources = (log.metadata as Record<string, unknown>)?.sourcesCited;
            if (Array.isArray(sources)) {
                for (const src of sources) {
                    citationCounts[String(src)] = (citationCounts[String(src)] || 0) + 1;
                }
            }
        }

        const topCitations = Object.entries(citationCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([title, count]) => ({ title, count }));

        // Build the per-tier chunk count from the configured tier list.
        // The "shared" key represents chunks visible to every tier and is
        // always emitted so the admin dashboard can render it alongside the
        // per-tier counts (see admin/page.tsx).
        const tierBreakdown: Record<string, number> = { shared: sharedChunks };
        for (const tier of config.access.tiers) {
            tierBreakdown[tier.id] = tierCounts[tier.id] || 0;
        }

        return NextResponse.json({
            totalChunks,
            tierBreakdown,
            topCitations,
            documents: byDocument.map((d) => ({
                title: d._id,
                category: d.category,
                chunks: d.count,
                tiers: d.tiers || [],
            })),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message.includes("Unauthorized") ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

/**
 * DELETE /api/admin/rag — Clear all RAG data (for re-ingestion)
 */
export async function DELETE() {
    try {
        await requireAdmin();
        await connectDB();

        const result = await KnowledgeChunk.deleteMany({});

        return NextResponse.json({
            message: "RAG data cleared",
            deletedChunks: result.deletedCount,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message.includes("Unauthorized") ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
