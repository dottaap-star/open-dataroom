import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatProvider, EmbeddingsProvider, Message } from "./types";

function getClient(): GoogleGenerativeAI {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!key) {
        throw new Error(
            "Gemini API key not set. Configure GEMINI_API_KEY (preferred) or GOOGLE_GENERATIVE_AI_API_KEY in .env.local.",
        );
    }
    return new GoogleGenerativeAI(key);
}

export class GeminiChatProvider implements ChatProvider {
    constructor(private modelName: string) {}

    async *streamChat(
        systemPrompt: string,
        history: Message[],
        userMessage: string,
    ): AsyncIterable<string> {
        const genAI = getClient();
        const model = genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction: { role: "user", parts: [{ text: systemPrompt }] },
        });

        const chat = model.startChat({
            history: history.map((m) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
            })),
        });

        const result = await chat.sendMessageStream(userMessage);
        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) yield text;
        }
    }
}

export class GeminiEmbeddingsProvider implements EmbeddingsProvider {
    constructor(private modelName: string) {}

    async embed(texts: string[]): Promise<number[][]> {
        const genAI = getClient();
        const model = genAI.getGenerativeModel({ model: this.modelName });

        const out: number[][] = [];
        // Batch in groups of 10 to stay under per-second rate caps.
        for (let i = 0; i < texts.length; i += 10) {
            const batch = texts.slice(i, i + 10);
            const results = await Promise.all(
                batch.map(async (t) => (await model.embedContent(t)).embedding.values),
            );
            out.push(...results);
        }
        return out;
    }

    async embedQuery(text: string): Promise<number[]> {
        const genAI = getClient();
        const model = genAI.getGenerativeModel({ model: this.modelName });
        return (await model.embedContent(text)).embedding.values;
    }
}
