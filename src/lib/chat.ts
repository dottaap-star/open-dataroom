import { searchChunks, type SearchResult } from "./rag/search";
import { config } from "@/config";

/**
 * Mechanical guard rails appended to every system prompt regardless of the
 * forker's chosen `config.chatbot.persona`. These are the non-negotiable
 * behaviours (citation discipline, security boundary, RAG honesty) that
 * keep the bot useful even when the persona is rewritten. Forkers tune
 * voice via persona; they don't get to disable these.
 */
const GUARD_RAILS = `

Style + safety rules (these apply regardless of persona):
- When citing numbers or facts, mention which document they come from.
- If you don't know something, say so plainly. Never speculate on financials you haven't seen.
- Never make promises about future performance.
- Use ONLY the context provided below to answer factual questions. If the context doesn't contain the answer, say so honestly.
- Only mention source documents when you actually use specific facts or numbers from them. Don't list sources for conversational responses.
- For casual greetings, respond warmly without citing documents — context will be empty for these.

CRITICAL SECURITY RULE: You only have access to documents this specific investor is authorized to see. NEVER reference, quote, or hint at the existence of documents or information outside of the provided context. If you don't have context for a question, say you don't have that information in your reading list.`;

export interface ChatContext {
    query: string;
    history: { role: "user" | "assistant"; content: string }[];
    tier?: string;
}

/**
 * Determine if a message needs RAG context.
 *
 * Preserves the original heuristic exactly — greeting fast-path skips the
 * keyword search entirely, saving the round-trip + tokens, and stops the
 * bot from awkwardly citing financial docs in response to "hi". The
 * greeting set lives in `config.chatbot.greetingPatterns`; the heuristic
 * itself (2 words or less, no question mark) is hardcoded.
 */
function needsRAG(query: string): boolean {
    const cleaned = query.trim().toLowerCase().replace(/[!.,?]+$/g, "");

    const patterns = config.chatbot.greetingPatterns;
    if (patterns.length > 0) {
        for (const p of patterns) {
            if (cleaned === p.toLowerCase()) return false;
        }
    }

    // Single word or two-word social phrases without a question mark
    if (cleaned.split(/\s+/).length <= 2 && !cleaned.includes("?")) return false;

    return true;
}

/**
 * Build the prompt + retrieve RAG context for a turn.
 *
 * Two heuristics worth pointing out (easy to lose during a refactor):
 *   1. `needsRAG()` greeting fast-path — see above.
 *   2. History-augmented search query — for follow-up questions like
 *      "how much?" after "tell me about revenue", we prepend the last
 *      user message to the current one so the keyword search has enough
 *      anchor. Without this, "how much?" returns garbage.
 */
export async function buildChatPrompt(ctx: ChatContext): Promise<{
    systemPrompt: string;
    userMessage: string;
    sources: SearchResult[];
}> {
    let systemPrompt = config.chatbot.persona + GUARD_RAILS;

    // Tier-specific guidance appended to the persona, drawn from config.
    if (ctx.tier && config.access.tierContext[ctx.tier]) {
        systemPrompt += `\n\nINVESTOR CONTEXT: ${config.access.tierContext[ctx.tier]}`;
    }

    if (!needsRAG(ctx.query)) {
        return { systemPrompt, userMessage: ctx.query, sources: [] };
    }

    let searchQuery = ctx.query;
    if (ctx.history.length > 0) {
        const lastUserMsg = [...ctx.history].reverse().find((m) => m.role === "user");
        if (lastUserMsg && lastUserMsg.content.length > 10) {
            // Cap the prepended context at 200 chars so a giant pasted block
            // upstream doesn't blow up the keyword scoring loop in search.ts
            // (every keyword runs a regex against every chunk; huge queries
            // are catastrophic). 200 is plenty for the "how much?" follow-up
            // case this heuristic exists to serve.
            const context = lastUserMsg.content.slice(0, 200);
            searchQuery = `${context} ${ctx.query}`;
        }
    }

    const sources = await searchChunks(searchQuery, config.technical.retrievalTopK, ctx.tier);

    const seen = new Set<string>();
    const uniqueSources = sources.filter((s) => {
        if (seen.has(s.documentTitle)) return false;
        seen.add(s.documentTitle);
        return true;
    });

    let contextBlock = "";
    if (uniqueSources.length > 0) {
        contextBlock = "\n\n--- CONTEXT FROM DATA ROOM DOCUMENTS ---\n";
        for (const source of uniqueSources) {
            contextBlock += `\n[Source: ${source.documentTitle}]\n${source.content}\n`;
        }
        contextBlock += "\n--- END CONTEXT ---\n";
    }

    return {
        systemPrompt,
        userMessage: ctx.query + contextBlock,
        sources: uniqueSources,
    };
}
