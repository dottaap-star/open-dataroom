/**
 * LLM provider contract.
 *
 * Each `ChatProvider` adapter accepts a uniform `(systemPrompt, history,
 * userMessage)` triple and yields a stream of plain text fragments — the
 * per-provider rewrap (Gemini's `systemInstruction` shape, OpenAI's
 * `system`-as-first-message convention, Anthropic's top-level `system`
 * parameter) happens INSIDE the adapter. The route layer never sees
 * provider-specific shapes.
 *
 * Errors: adapters throw plain `Error` instances. The route catches and
 * maps to the NDJSON `{type: "error"}` frame uniformly.
 *
 * Edge runtime: this file is type-only. Concrete adapters (gemini.ts,
 * openai.ts, anthropic.ts) import the provider SDKs and must NOT be
 * imported from edge-runtime code paths.
 */

export interface Message {
    role: "user" | "assistant";
    content: string;
}

export interface ChatProvider {
    /**
     * Stream a chat completion as plain text fragments. `systemPrompt` is
     * passed separately from `history` so each adapter can place it in the
     * provider-specific slot. `userMessage` is the final user turn (kept
     * separate so adapters that distinguish prompt vs history can keep them
     * apart — Gemini's `startChat({history})` then `sendMessageStream(msg)`).
     *
     * `abortSignal` is forwarded to the SDK where supported; otherwise
     * adapters should poll it between yields.
     */
    streamChat(
        systemPrompt: string,
        history: Message[],
        userMessage: string,
        abortSignal?: AbortSignal,
    ): AsyncIterable<string>;
}

export interface EmbeddingsProvider {
    /** Batch embeddings. Returns one vector per input, in input order. */
    embed(texts: string[]): Promise<number[][]>;
    /** Single-query embedding. Same dimension as `embed()`. */
    embedQuery(text: string): Promise<number[]>;
}
