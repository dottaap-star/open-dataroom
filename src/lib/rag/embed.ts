import { getEmbeddingsProvider } from "../llm/factory";

/**
 * Thin facade over the active embeddings provider (see
 * `src/lib/llm/factory.ts`). All callers (`rag/ingest.ts` and any future
 * vector-search wiring) go through here so flipping
 * `config.ai.embeddingsProvider` doesn't ripple through the codebase.
 *
 * Provider dimensions DIFFER (Gemini text-embedding-005 = 768d, OpenAI
 * text-embedding-3-small = 1536d). Flipping providers without re-ingesting
 * yields incompatible vectors — the keyword scorer ignores embeddings
 * today so this is harmless until vector search ships, but document it.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
    return getEmbeddingsProvider().embed(texts);
}

export async function embedQuery(query: string): Promise<number[]> {
    return getEmbeddingsProvider().embedQuery(query);
}
