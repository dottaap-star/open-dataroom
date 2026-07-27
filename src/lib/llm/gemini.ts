import { GoogleGenAI } from "@google/genai";
import type { ChatProvider, EmbeddingsProvider, Message } from "./types";

function getClient(): GoogleGenAI {
    const key = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!key) {
        throw new Error(
            "Gemini API key not set. Configure GOOGLE_GEMINI_API_KEY (preferred), GEMINI_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY in .env.local.",
        );
    }
    return new GoogleGenAI({ vertexai: true, apiKey: key });
}

export class GeminiChatProvider implements ChatProvider {
    constructor(private modelName: string) {}

    async *streamChat(
        systemPrompt: string,
        history: Message[],
        userMessage: string,
    ): AsyncIterable<string> {
        const ai = getClient();
        const chat = ai.chats.create({
            model: this.modelName,
            config: { systemInstruction: systemPrompt },
            history: history.map((m) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
            })),
        });

        const stream = await chat.sendMessageStream({ message: userMessage });
        for await (const chunk of stream) {
            const text = chunk.text;
            if (text) yield text;
        }
    }
}

export class GeminiEmbeddingsProvider implements EmbeddingsProvider {
    constructor(private modelName: string) {}

    async embed(texts: string[]): Promise<number[][]> {
        const ai = getClient();

        const out: number[][] = [];
        // Batch in groups of 10 to stay under per-second rate caps.
        for (let i = 0; i < texts.length; i += 10) {
            const batch = texts.slice(i, i + 10);
            const results = await Promise.all(
                batch.map(async (t) => {
                    const res = await ai.models.embedContent({ model: this.modelName, contents: t });
                    return res.embeddings?.[0]?.values ?? [];
                }),
            );
            out.push(...results);
        }
        return out;
    }

    async embedQuery(text: string): Promise<number[]> {
        const ai = getClient();
        const res = await ai.models.embedContent({ model: this.modelName, contents: text });
        return res.embeddings?.[0]?.values ?? [];
    }
}
