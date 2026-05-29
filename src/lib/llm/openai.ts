import OpenAI from "openai";
import type { ChatProvider, EmbeddingsProvider, Message } from "./types";

function getClient(): OpenAI {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
        throw new Error("OpenAI API key not set. Configure OPENAI_API_KEY in .env.local.");
    }
    return new OpenAI({ apiKey: key });
}

export class OpenAIChatProvider implements ChatProvider {
    constructor(private modelName: string) {}

    async *streamChat(
        systemPrompt: string,
        history: Message[],
        userMessage: string,
        abortSignal?: AbortSignal,
    ): AsyncIterable<string> {
        const client = getClient();

        const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
            { role: "system", content: systemPrompt },
            ...history.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage },
        ];

        const stream = await client.chat.completions.create(
            {
                model: this.modelName,
                messages,
                stream: true,
            },
            abortSignal ? { signal: abortSignal } : undefined,
        );

        for await (const part of stream) {
            const delta = part.choices?.[0]?.delta?.content;
            if (delta) yield delta;
        }
    }
}

export class OpenAIEmbeddingsProvider implements EmbeddingsProvider {
    constructor(private modelName: string) {}

    async embed(texts: string[]): Promise<number[][]> {
        const client = getClient();
        // OpenAI's embeddings endpoint takes the full batch in one request; the
        // free-tier rate limit is per-minute, not per-call, so batching here
        // just shaves round trips.
        const result = await client.embeddings.create({
            model: this.modelName,
            input: texts,
        });
        return result.data.map((d) => d.embedding);
    }

    async embedQuery(text: string): Promise<number[]> {
        const client = getClient();
        const result = await client.embeddings.create({
            model: this.modelName,
            input: text,
        });
        return result.data[0].embedding;
    }
}
