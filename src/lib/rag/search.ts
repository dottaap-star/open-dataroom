import { KnowledgeChunk } from "../models/knowledge-chunk";
import { config } from "@/config";

export interface SearchResult {
    content: string;
    documentTitle: string;
    category: string;
    chunkIndex: number;
    score: number;
}

/**
 * Stop words pulled out of keyword extraction. Generic English filler — the
 * list is heuristic, not exhaustive, and intentionally not config-driven
 * (rare to need tenant-specific stop words for keyword search).
 */
const STOP_WORDS = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have",
    "has", "had", "do", "does", "did", "will", "would", "could", "should", "may",
    "might", "can", "shall", "to", "of", "in", "for", "on", "with", "at", "by",
    "from", "as", "into", "about", "what", "which", "who", "whom", "this", "that",
    "these", "those", "am", "or", "and", "but", "if", "not", "no", "so", "than",
    "too", "very", "just", "how", "me", "my", "your", "our", "their", "its", "we",
    "you", "they", "it", "he", "she", "i", "tell", "walk", "through", "give",
    "explain", "describe", "show", "know", "think", "want", "need", "like", "get",
    "make", "take", "come", "go", "see", "look", "find", "use", "say", "said",
]);

/**
 * Keyword scoring with category boosting. Two knobs, both config-driven:
 *   - `config.chatbot.topicPreferences`: keyword → category list. Empty map
 *     disables category boosting entirely (pure keyword scoring).
 *   - `config.documents.importanceWeights`: per-category multiplier on the
 *     keyword score. Missing category defaults to 1.0 (neutral).
 *
 * Embeddings live on the KnowledgeChunk row but are NEVER queried — the
 * template ships keyword-only; a vector-search swap is documented in docs/rag.md.
 * Documented honestly in docs/rag.md.
 */
export async function searchChunks(query: string, topK = 8, tier?: string): Promise<SearchResult[]> {
    const filter: Record<string, unknown> = {};
    if (tier) {
        filter.tiers = tier;
    }
    const allChunks = await KnowledgeChunk.find(filter).lean();

    if (allChunks.length === 0) return [];

    const keywords = query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    // No meaningful keywords ⇒ return a deduped sample so the assistant
    // still has something to work with for very-short queries.
    if (keywords.length === 0) {
        const seen = new Set<string>();
        return allChunks
            .filter((c) => {
                if (seen.has(c.documentTitle)) return false;
                seen.add(c.documentTitle);
                return true;
            })
            .slice(0, topK)
            .map((c) => ({
                content: c.content,
                documentTitle: c.documentTitle,
                category: c.category,
                chunkIndex: c.chunkIndex,
                score: 0.5,
            }));
    }

    // Build the preferred-category set from this query's keywords.
    const topicPrefs = config.chatbot.topicPreferences;
    const importanceWeights = config.documents.importanceWeights;
    const preferredCategories = new Set<string>();
    for (const keyword of keywords) {
        const prefs = topicPrefs[keyword];
        if (prefs) prefs.forEach((p) => preferredCategories.add(p));
    }

    const scored = allChunks.map((chunk) => {
        const contentLower = chunk.content.toLowerCase();
        let score = 0;

        // Keyword frequency.
        for (const keyword of keywords) {
            const regex = new RegExp(`\\b${keyword}\\w*`, "gi");
            const matches = contentLower.match(regex);
            if (matches) score += matches.length;
        }

        // Diversity bonus.
        const uniqueMatches = keywords.filter((k) => contentLower.includes(k)).length;
        score += uniqueMatches * 3;

        // Title match bonus.
        const titleLower = chunk.documentTitle.toLowerCase();
        const titleMatches = keywords.filter((k) => titleLower.includes(k)).length;
        score += titleMatches * 5;

        // Category boost (skipped entirely if topicPreferences is empty).
        if (preferredCategories.size > 0) {
            const catLower = chunk.category.toLowerCase();
            const isPreferred = [...preferredCategories].some(
                (pref) => catLower.includes(pref) || titleLower.includes(pref),
            );
            if (isPreferred) {
                score *= 2;
            } else if (score > 0) {
                score *= 0.6;
            }
        }

        // Document importance weight.
        const importance = importanceWeights[chunk.category] ?? 1.0;
        score *= importance;

        // Intro-chunk bonus.
        if (chunk.chunkIndex === 0) score *= 1.2;
        else if (chunk.chunkIndex === 1) score *= 1.1;

        // Recency bias.
        if (chunk.createdAt) {
            const ageMs = Date.now() - new Date(chunk.createdAt).getTime();
            const ageDays = ageMs / (1000 * 60 * 60 * 24);
            if (ageDays < 7) score *= 1.15;
            else if (ageDays < 30) score *= 1.05;
        }

        return {
            content: chunk.content,
            documentTitle: chunk.documentTitle,
            category: chunk.category,
            chunkIndex: chunk.chunkIndex,
            score,
        };
    });

    scored.sort((a, b) => b.score - a.score);

    // Max 2 chunks per document so a single doc doesn't crowd out the topK.
    const perDoc = new Map<string, number>();
    const results: SearchResult[] = [];
    for (const item of scored) {
        if (item.score <= 0) break;
        const count = perDoc.get(item.documentTitle) || 0;
        if (count >= 2) continue;
        perDoc.set(item.documentTitle, count + 1);
        results.push(item);
        if (results.length >= topK) break;
    }

    return results;
}
