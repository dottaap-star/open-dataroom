"use client";

import { useState, useRef, useEffect } from "react";
import { cx } from "@/utils/cx";
import type { ChatMessage } from "@/types";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { config } from "@/config";

const STARTER_QUESTIONS = config.chatbot.starterQuestions;

interface ChatPanelProps {
    onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async (content: string) => {
        if (!content.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: content.trim(),
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        const assistantId = (Date.now() + 1).toString();

        // Add empty assistant message that we'll stream into
        setMessages((prev) => [
            ...prev,
            { id: assistantId, role: "assistant", content: "", timestamp: new Date().toISOString() },
        ]);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: content.trim(),
                    history: messages.map((m) => ({ role: m.role, content: m.content })),
                }),
            });

            if (!response.ok) throw new Error("Chat request failed");

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response stream");

            const decoder = new TextDecoder();
            let accumulated = "";
            let sources: { documentTitle: string; page?: number }[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value, { stream: true });
                const lines = text.split("\n").filter(Boolean);

                for (const line of lines) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.type === "text") {
                            accumulated += parsed.content;
                            setMessages((prev) =>
                                prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
                            );
                        } else if (parsed.type === "sources") {
                            sources = parsed.sources;
                        } else if (parsed.type === "done") {
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantId ? { ...m, content: accumulated, sourcesCited: sources } : m
                                )
                            );
                        } else if (parsed.type === "error") {
                            throw new Error(parsed.error);
                        }
                    } catch {
                        // Skip malformed lines
                    }
                }
            }
        } catch {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId && !m.content
                        ? { ...m, content: config.chatbot.errorMessage }
                        : m
                )
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    return (
        <div className="flex h-full flex-col bg-primary">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-secondary px-4 py-3">
                <div>
                    <h2 className="text-sm font-semibold text-primary">{config.chatbot.headerTitle}</h2>
                    <p className="text-xs text-tertiary">{config.chatbot.headerSubtitle}</p>
                </div>
                <button onClick={onClose} className="rounded-lg p-1.5 text-tertiary hover:bg-secondary hover:text-primary">
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center">
                        <div className="mb-6 rounded-full bg-brand-50 p-4">
                            <svg className="size-8 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                            </svg>
                        </div>
                        <h3 className="text-md font-semibold text-primary">{config.chatbot.headerTitle}</h3>
                        <p className="mt-1 text-center text-sm text-tertiary">{config.chatbot.greeting}</p>
                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                            {STARTER_QUESTIONS.map((q) => (
                                <button
                                    key={q}
                                    onClick={() => sendMessage(q)}
                                    className="rounded-full border border-secondary bg-primary px-3 py-1.5 text-xs font-medium text-tertiary transition-colors hover:border-brand-300 hover:bg-brand-25 hover:text-brand-700"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={cx("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                                <div
                                    className={cx(
                                        "max-w-[85%] rounded-2xl px-4 py-2.5",
                                        msg.role === "user"
                                            ? "bg-brand-600 text-white"
                                            : "bg-secondary text-primary"
                                    )}
                                >
                                    {msg.role === "assistant" ? (
                                        <div className="prose prose-sm max-w-none">
                                            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{msg.content}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="text-sm">{msg.content}</p>
                                    )}
                                    {msg.sourcesCited && msg.sourcesCited.length > 0 && (
                                        <div className="mt-2 border-t border-gray-200 pt-2">
                                            <p className="text-xs font-medium text-tertiary">Sources:</p>
                                            {msg.sourcesCited.map((s, i) => (
                                                <p key={i} className="text-xs text-quaternary">
                                                    {s.documentTitle}
                                                    {s.page ? `, p.${s.page}` : ""}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="rounded-2xl bg-secondary px-4 py-3">
                                    <div className="flex gap-1.5">
                                        <span className="size-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                                        <span className="size-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                                        <span className="size-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="border-t border-secondary p-4">
                <div className="flex items-end gap-2 rounded-xl border border-secondary bg-primary p-2 shadow-xs focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={config.chatbot.placeholderText}
                        rows={1}
                        className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1 text-sm text-primary placeholder:text-quaternary focus:outline-none"
                    />
                    <button
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim() || isLoading}
                        className="rounded-lg bg-brand-600 p-2 text-white transition-colors hover:bg-brand-700 disabled:opacity-40 disabled:hover:bg-brand-600"
                    >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </div>
                <p className="mt-2 text-center text-xs text-quaternary">
                    Answers based on data room documents.
                </p>
            </div>
        </div>
    );
}
