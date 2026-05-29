import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { buildChatPrompt } from "@/lib/chat";
import { KnowledgeChunk } from "@/lib/models/knowledge-chunk";
import { AccessLog } from "@/lib/models/access-log";
import { getCurrentUser } from "@/lib/auth";
import { getChatProvider } from "@/lib/llm/factory";
import { cookies } from "next/headers";
import { config } from "@/config";

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { message, history = [], testTier } = await request.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        await connectDB();

        const chunkCount = await KnowledgeChunk.countDocuments();
        if (chunkCount === 0) {
            // Stream a single text frame so the chat panel's NDJSON parser
            // renders it in the assistant bubble. The original code returned
            // a plain JSON object here, which the streaming client silently
            // dropped (bug in pre-Phase-5 code, fixed now).
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: "sources", sources: [] }) + "\n"));
                    controller.enqueue(
                        encoder.encode(
                            JSON.stringify({ type: "text", content: config.chatbot.emptyKnowledgeMessage }) + "\n",
                        ),
                    );
                    controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
                    controller.close();
                },
            });
            return new Response(stream, {
                headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
        }

        // Resolve the effective tier for this request.
        // - Admins: testTier param (from the admin RAG test UI) wins; otherwise
        //   the preview_tier cookie if it points at a currently-configured tier.
        // - Investors: their own tier. The tier-less-investor footgun is caught
        //   here (Phase 4 fix).
        let userTier: string | undefined;
        const validTierIds = config.access.tiers.map((t) => t.id);
        if (user.role === "admin") {
            if (testTier) {
                userTier = testTier;
            } else {
                const cookieStore = await cookies();
                const previewTier = cookieStore.get("preview_tier")?.value;
                if (previewTier && validTierIds.includes(previewTier)) {
                    userTier = previewTier;
                }
            }
        } else {
            if (validTierIds.length > 0 && !user.tier) {
                return NextResponse.json(
                    { error: "Your account has no access tier assigned. Please contact the admin." },
                    { status: 403 },
                );
            }
            userTier = user.tier;
        }

        const { systemPrompt, userMessage, sources } = await buildChatPrompt({
            query: message,
            history,
            tier: userTier,
        });

        // Log chat message with sources cited.
        await AccessLog.create({
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            action: "chat_message",
            metadata: {
                message: message.slice(0, 200),
                sourcesCited: sources.map((s) => s.documentTitle),
            },
            ip: request.headers.get("x-forwarded-for") || "unknown",
            userAgent: request.headers.get("user-agent") || "unknown",
        });

        const chatProvider = getChatProvider();
        const typedHistory = (history as { role: string; content: string }[]).map((m) => ({
            role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
            content: m.content,
        }));

        // NDJSON stream — one JSON per line. Client (`chat-panel.tsx`) splits
        // on \n and dispatches by `type`. Frame order: sources → text* → done,
        // or sources → error on failure mid-stream.
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    controller.enqueue(
                        encoder.encode(
                            JSON.stringify({
                                type: "sources",
                                sources: sources.map((s) => ({
                                    documentTitle: s.documentTitle,
                                    category: s.category,
                                })),
                            }) + "\n",
                        ),
                    );

                    for await (const text of chatProvider.streamChat(
                        systemPrompt,
                        typedHistory,
                        userMessage,
                        request.signal,
                    )) {
                        if (text) {
                            controller.enqueue(
                                encoder.encode(JSON.stringify({ type: "text", content: text }) + "\n"),
                            );
                        }
                    }

                    controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
                    controller.close();
                } catch (err) {
                    const msg = err instanceof Error ? err.message : "Stream error";
                    controller.enqueue(
                        encoder.encode(JSON.stringify({ type: "error", error: msg }) + "\n"),
                    );
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
                "Cache-Control": "no-cache",
            },
        });
    } catch (err) {
        console.error("Chat error:", err);
        const message = err instanceof Error ? err.message : "Chat failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
