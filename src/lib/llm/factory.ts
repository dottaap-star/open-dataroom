/**
 * Resolves the active chat + embeddings providers from `dataroom.config.ts`.
 *
 * Singletons per provider type, recomputed each call (cheap — the adapter
 * constructors just hold a model name; SDK clients are created lazily per
 * call inside the adapter).
 *
 * The config schema guarantees:
 *   - `config.ai.chatProvider` is one of "gemini" | "openai" | "anthropic"
 *   - `config.ai.embeddingsProvider` is one of "gemini" | "openai"
 * So the switch statements below are exhaustive.
 */

import { config } from "@/config";
import type { ChatProvider, EmbeddingsProvider } from "./types";
import { GeminiChatProvider, GeminiEmbeddingsProvider } from "./gemini";
import { OpenAIChatProvider, OpenAIEmbeddingsProvider } from "./openai";
import { AnthropicChatProvider } from "./anthropic";

export function getChatProvider(): ChatProvider {
    const { chatProvider, chatModel } = config.ai;
    switch (chatProvider) {
        case "gemini":
            return new GeminiChatProvider(chatModel);
        case "openai":
            return new OpenAIChatProvider(chatModel);
        case "anthropic":
            return new AnthropicChatProvider(chatModel);
    }
}

export function getEmbeddingsProvider(): EmbeddingsProvider {
    const { embeddingsProvider, embeddingsModel } = config.ai;
    switch (embeddingsProvider) {
        case "gemini":
            return new GeminiEmbeddingsProvider(embeddingsModel);
        case "openai":
            return new OpenAIEmbeddingsProvider(embeddingsModel);
    }
}
