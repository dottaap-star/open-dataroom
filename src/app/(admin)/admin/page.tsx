"use client";

import { useState, useEffect, useCallback } from "react";
import { config } from "@/config";

const DEFAULT_TEST_TIER = config.access.tiers[0]?.id ?? "";

interface DashboardData {
    metrics: {
        totalInvestors: number;
        activeThisWeek: number;
        docViews: number;
        chatMessages: number;
        totalDocuments: number;
    };
    lastSync: {
        status: string;
        startedAt: string;
        filesAdded: number;
        filesUpdated: number;
    } | null;
    recentActivity: {
        _id: string;
        userName: string;
        userEmail: string;
        action: string;
        resourceName?: string;
        metadata?: Record<string, unknown>;
        timestamp: string;
    }[];
}

const ACTION_LABELS: Record<string, string> = {
    login: "Logged in",
    view_document: "Viewed",
    chat_message: "Chatted",
    page_view: "Visited",
    admin_revoke: "Revoked",
    admin_restore: "Restored",
};

export default function AdminDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [ragData, setRagData] = useState<{
        totalChunks: number;
        tierBreakdown: Record<string, number>;
        topCitations: { title: string; count: number }[];
        documents: { title: string; category: string; chunks: number; tiers: string[] }[];
    } | null>(null);
    const [ingesting, setIngesting] = useState(false);
    const [ragMessage, setRagMessage] = useState("");
    const [testTier, setTestTier] = useState(DEFAULT_TEST_TIER);
    const [testQuery, setTestQuery] = useState("");
    const [testResponse, setTestResponse] = useState("");
    const [testSources, setTestSources] = useState<string[]>([]);
    const [testing, setTesting] = useState(false);

    const fetchData = useCallback(async () => {
        const [dashRes, ragRes] = await Promise.all([
            fetch("/api/admin/dashboard").then((r) => r.json()),
            fetch("/api/admin/rag").then((r) => r.json()),
        ]);
        if (!dashRes.error) setData(dashRes);
        if (!ragRes.error) setRagData(ragRes);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

    const formatRelative = (d: string) => {
        const diff = Date.now() - new Date(d).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    const m = data?.metrics;

    return (
        <div>
            <h1 className="text-display-xs font-semibold text-primary">Dashboard</h1>
            <p className="mt-2 text-md text-tertiary">Overview of investor portal activity.</p>

            {/* Metrics */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Total Investors" value={m?.totalInvestors ?? "-"} />
                <MetricCard label="Active This Week" value={m?.activeThisWeek ?? "-"} />
                <MetricCard label="Documents Viewed" value={m?.docViews ?? "-"} />
                <MetricCard label="Chat Messages" value={m?.chatMessages ?? "-"} />
            </div>

            {/* AI Knowledge Base */}
            <div className="mt-8 rounded-xl border border-secondary bg-primary p-6 shadow-xs">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-md font-semibold text-primary">AI Knowledge Base</h2>
                        <p className="mt-1 text-sm text-tertiary">
                            {ragData ? `${ragData.totalChunks} chunks across ${ragData.documents.length} documents` : "Loading..."}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={async () => {
                                if (!confirm("Clear all chunks and re-ingest? This may take a minute.")) return;
                                setIngesting(true);
                                setRagMessage("");
                                try {
                                    await fetch("/api/admin/rag", { method: "DELETE" });
                                    const res = await fetch("/api/admin/rag", { method: "POST" });
                                    const json = await res.json();
                                    setRagMessage(`Ingested ${json.totalChunks} chunks from ${json.drive?.processed || 0} documents`);
                                    fetchData();
                                } catch {
                                    setRagMessage("Ingestion failed");
                                } finally {
                                    setIngesting(false);
                                }
                            }}
                            disabled={ingesting}
                            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-brand-700 disabled:opacity-50"
                        >
                            {ingesting ? "Ingesting..." : "Re-ingest"}
                        </button>
                    </div>
                </div>
                {ragMessage && (
                    <p className={`mt-3 text-sm ${ragMessage.includes("fail") ? "text-error-600" : "text-success-600"}`}>
                        {ragMessage}
                    </p>
                )}
                {ragData && ragData.totalChunks > 0 && config.access.tiers.length > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        {config.access.tiers.map((tier) => (
                            <div key={tier.id} className={`rounded-lg px-4 py-3 ${tier.colour ?? "bg-gray-100 text-gray-700"}`}>
                                <p className="text-xs font-medium">{tier.label}</p>
                                <p className="mt-1 text-lg font-semibold">{ragData.tierBreakdown[tier.id] ?? 0}</p>
                            </div>
                        ))}
                        {/* Shared chunks are accessible to every tier; always show alongside per-tier counts */}
                        <div className="rounded-lg bg-green-50 px-4 py-3 text-green-700">
                            <p className="text-xs font-medium">Shared</p>
                            <p className="mt-1 text-lg font-semibold">{ragData.tierBreakdown.shared ?? 0}</p>
                        </div>
                    </div>
                )}

                {/* Test chat as tier */}
                {ragData && ragData.totalChunks > 0 && (
                    <div className="mt-4 rounded-lg border border-secondary p-4">
                        <h3 className="text-sm font-semibold text-primary">Test Chat as Investor</h3>
                        <div className="mt-3 flex gap-2">
                            <select
                                value={testTier}
                                onChange={(e) => setTestTier(e.target.value)}
                                className="rounded-lg border border-primary bg-primary px-3 py-2 text-sm"
                            >
                                {config.access.tiers.map((tier) => (
                                    <option key={tier.id} value={tier.id}>{tier.label}</option>
                                ))}
                                <option value="">Admin (all docs)</option>
                            </select>
                            <input
                                type="text"
                                value={testQuery}
                                onChange={(e) => setTestQuery(e.target.value)}
                                placeholder="Ask a question..."
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !testing && testQuery.trim()) {
                                        e.preventDefault();
                                        document.getElementById("test-chat-btn")?.click();
                                    }
                                }}
                                className="flex-1 rounded-lg border border-primary bg-primary px-3 py-2 text-sm placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
                            />
                            <button
                                id="test-chat-btn"
                                disabled={testing || !testQuery.trim()}
                                onClick={async () => {
                                    setTesting(true);
                                    setTestResponse("");
                                    setTestSources([]);
                                    try {
                                        const res = await fetch("/api/chat", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                message: testQuery,
                                                history: [],
                                                testTier: testTier || undefined,
                                            }),
                                        });
                                        const reader = res.body?.getReader();
                                        const decoder = new TextDecoder();
                                        let text = "";
                                        if (reader) {
                                            while (true) {
                                                const { done, value } = await reader.read();
                                                if (done) break;
                                                const lines = decoder.decode(value).split("\n").filter(Boolean);
                                                for (const line of lines) {
                                                    try {
                                                        const parsed = JSON.parse(line);
                                                        if (parsed.type === "sources") {
                                                            setTestSources(parsed.sources.map((s: { documentTitle: string }) => s.documentTitle));
                                                        } else if (parsed.type === "text") {
                                                            text += parsed.content;
                                                            setTestResponse(text);
                                                        }
                                                    } catch { /* skip */ }
                                                }
                                            }
                                        }
                                    } catch {
                                        setTestResponse("Error: chat request failed");
                                    } finally {
                                        setTesting(false);
                                    }
                                }}
                                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-brand-700 disabled:opacity-50"
                            >
                                {testing ? "..." : "Test"}
                            </button>
                        </div>
                        {testResponse && (
                            <div className="mt-3 rounded-lg bg-secondary p-3">
                                <p className="whitespace-pre-wrap text-sm text-primary">{testResponse}</p>
                                {testSources.length > 0 && (
                                    <p className="mt-2 text-xs text-tertiary">
                                        Sources: {testSources.join(", ")}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Most cited sources */}
                {ragData && ragData.topCitations && ragData.topCitations.length > 0 && (
                    <div className="mt-4">
                        <h3 className="mb-2 text-sm font-semibold text-primary">Most Cited in Chat</h3>
                        <div className="space-y-1">
                            {ragData.topCitations.map((c, i) => (
                                <div key={c.title} className="flex items-center justify-between rounded px-3 py-1.5 text-sm">
                                    <span className="text-tertiary">
                                        <span className="mr-2 text-xs text-quaternary">{i + 1}.</span>
                                        {c.title}
                                    </span>
                                    <span className="text-xs font-medium text-brand-600">{c.count} citations</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Recent activity */}
            <div className="mt-8">
                <h2 className="mb-4 text-md font-semibold text-primary">Recent Activity</h2>
                {!data?.recentActivity?.length ? (
                    <div className="flex items-center justify-center rounded-xl border border-dashed border-secondary py-12">
                        <p className="text-sm text-quaternary">No activity yet. Invite your first investor to get started.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {data.recentActivity.map((log) => (
                            <div key={log._id} className="flex items-center justify-between rounded-lg border border-secondary bg-primary px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                                        {log.userName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm text-primary">
                                            <span className="font-medium">{log.userName}</span>
                                            {" "}
                                            <span className="text-tertiary">
                                                {ACTION_LABELS[log.action] || log.action}
                                            </span>
                                            {log.resourceName && (
                                                <span className="text-tertiary"> {log.resourceName}</span>
                                            )}
                                            {log.action === "chat_message" && typeof log.metadata?.message === "string" && (
                                                <span className="text-quaternary"> &quot;{log.metadata.message.slice(0, 40)}...&quot;</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs text-quaternary">{formatRelative(log.timestamp)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-xl border border-secondary bg-primary p-6 shadow-xs">
            <p className="text-sm font-medium text-tertiary">{label}</p>
            <p className="mt-2 text-display-xs font-semibold text-primary">{value}</p>
        </div>
    );
}
