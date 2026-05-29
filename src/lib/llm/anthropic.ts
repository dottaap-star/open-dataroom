import Anthropic from "@anthropic-ai/sdk";
import type { ChatProvider, Message } from "./types";

function getClient(): Anthropic {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
        throw new Error("Anthropic API key not set. Configure ANTHROPIC_API_KEY in .env.local.");
    }
    return new Anthropic({ apiKey: key });
}

/**
 * Anthropic doesn't ship a first-party embeddings model, so this file
 * only exports a chat provider. Deployments that pick `chatProvider: "anthropic"`
 * still need a Gemini or OpenAI key for embeddings — enforced in the factory.
 */
export class AnthropicChatProvider implements ChatProvider {
    constructor(private modelName: string) {}

    async *streamChat(
        systemPrompt: string,
        history: Message[],
        userMessage: string,
        abortSignal?: AbortSignal,
    ): AsyncIterable<string> {
        const client = getClient();

        const messages: Anthropic.MessageParam[] = [
            ...history.map((m) => ({ role: m.role, content: m.content })),
            { role: "user" as const, content: userMessage },
        ];

        const stream = client.messages.stream(
            {
                model: this.modelName,
                max_tokens: 4096,
                system: systemPrompt,
                messages,
            },
            abortSignal ? { signal: abortSignal } : undefined,
        );

        for await (const event of stream) {
            if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
            ) {
                yield event.delta.text;
            }
        }
    }
}
