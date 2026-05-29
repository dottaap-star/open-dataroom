"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { config } from "@/config";

interface SyncRecord {
    _id: string;
    triggeredBy: string;
    filesAdded: number;
    filesUpdated: number;
    filesRemoved: number;
    status: string;
    errorMessage?: string;
    details: string[];
    startedAt: string;
    completedAt?: string;
}

interface DocRecord {
    _id: string;
    title: string;
    category: string;
    mimeType: string;
    sizeBytes: number;
    viewCount: number;
    tiers?: string[];
    allowDownload?: boolean;
    lastSyncedAt: string;
}

const TIER_TAG_STYLES: Record<string, string> = Object.fromEntries(
    config.access.tiers.map((t) => [t.id, t.colour ?? "bg-gray-100 text-gray-700"])
);
const TIER_TAG_LABELS: Record<string, string> = Object.fromEntries(
    config.access.tiers.map((t) => [t.id, t.label])
);

export default function AdminDocumentsPage() {
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<string>("");
    const [history, setHistory] = useState<SyncRecord[]>([]);
    const [documents, setDocuments] = useState<DocRecord[]>([]);
    const [historyPage, setHistoryPage] = useState(0);
    const HISTORY_PER_PAGE = 5;

    const fetchData = useCallback(async () => {
        const [syncRes, docsRes] = await Promise.all([
            fetch("/api/admin/sync").then((r) => r.json()),
            fetch("/api/documents").then((r) => r.json()),
        ]);
        if (syncRes.history) setHistory(syncRes.history);
        if (docsRes.documents) setDocuments(docsRes.documents);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSync = async () => {
        setSyncing(true);
        setSyncResult("");
        try {
            const res = await fetch("/api/admin/sync", { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
                setSyncResult(`Error: ${data.error}`);
            } else {
                setSyncResult(`Sync complete: ${data.filesAdded} added, ${data.filesUpdated} updated, ${data.filesRemoved} removed`);
                fetchData();
            }
        } catch {
            setSyncResult("Sync failed. Check server logs.");
        } finally {
            setSyncing(false);
        }
    };

    const driveConfigured = true; // Will fail gracefully if not configured

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (d: string) => new Date(d).toLocaleString();

    const toggleDocSetting = async (docId: string, field: "allowDownload" | "watermarkEnabled", value: boolean) => {
        try {
            const res = await fetch(`/api/documents/${docId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: value }),
            });
            if (res.ok) {
                setDocuments((docs) =>
                    docs.map((d) => (d._id === docId ? { ...d, [field]: value } : d))
                );
            }
        } catch {
            // Silent fail
        }
    };

    return (
        <div>
            <h1 className="text-display-xs font-semibold text-primary">Document Management</h1>
            <p className="mt-2 text-md text-tertiary">Manage documents synced from Google Drive.</p>

            {/* Drive sync controls */}
            <div className="mt-8 rounded-xl border border-secondary bg-primary p-6 shadow-xs">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-md font-semibold text-primary">Google Drive Sync</h2>
                        <p className="mt-1 text-sm text-tertiary">
                            {history.length > 0
                                ? `Last synced: ${formatDate(history[0].startedAt)}`
                                : "No syncs performed yet"}
                        </p>
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={syncing || !driveConfigured}
                        className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-brand-700 disabled:opacity-50"
                    >
                        {syncing ? "Syncing..." : "Sync Now"}
                    </button>
                </div>
                {syncResult && (
                    <p className={`mt-3 text-sm ${syncResult.startsWith("Error") ? "text-error-600" : "text-success-600"}`}>
                        {syncResult}
                    </p>
                )}
            </div>

            {/* Documents table */}
            <div className="mt-8">
                <h2 className="mb-4 text-md font-semibold text-primary">
                    All Documents ({documents.length})
                </h2>
                <div className="overflow-hidden rounded-xl border border-secondary shadow-xs">
                    <table className="w-full">
                        <thead className="bg-secondary">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">Size</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-tertiary">Views</th>
                                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-tertiary">Download</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary bg-primary">
                            {documents.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-quaternary">
                                        No documents synced yet. Click &quot;Sync Now&quot; to pull from Google Drive.
                                    </td>
                                </tr>
                            ) : (
                                documents.map((doc) => (
                                    <tr key={doc._id}>
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/admin/documents/${doc._id}`}
                                                className="text-sm font-medium text-primary hover:text-brand-600 hover:underline"
                                            >
                                                {doc.title}
                                            </Link>
                                            {doc.tiers && doc.tiers.length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {doc.tiers.length === 3 ? (
                                                        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-green-50 text-green-700">Shared</span>
                                                    ) : (
                                                        doc.tiers.map((t) => (
                                                            <span key={t} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TIER_TAG_STYLES[t] || "bg-gray-100 text-gray-600"}`}>
                                                                {TIER_TAG_LABELS[t] || t}
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                                                {doc.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-tertiary">{formatSize(doc.sizeBytes)}</td>
                                        <td className="px-6 py-4 text-sm text-tertiary">{doc.viewCount}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={!!doc.allowDownload}
                                                onClick={() => toggleDocSetting(doc._id, "allowDownload", !doc.allowDownload)}
                                                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                                                    doc.allowDownload ? "bg-brand-600" : "bg-gray-200"
                                                }`}
                                            >
                                                <span className={`inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform ${
                                                    doc.allowDownload ? "translate-x-4" : "translate-x-0.5"
                                                }`} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sync history */}
            <div className="mt-8">
                <h2 className="mb-4 text-md font-semibold text-primary">
                    Sync History ({history.length})
                </h2>
                <div className="space-y-3">
                    {history.length === 0 ? (
                        <div className="flex items-center justify-center rounded-xl border border-dashed border-secondary py-12">
                            <p className="text-sm text-quaternary">No sync history yet.</p>
                        </div>
                    ) : (
                        <>
                            {history
                                .slice(historyPage * HISTORY_PER_PAGE, (historyPage + 1) * HISTORY_PER_PAGE)
                                .map((record) => (
                                    <div key={record._id} className="rounded-lg border border-secondary bg-primary p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={`inline-block size-2 rounded-full ${
                                                        record.status === "success"
                                                            ? "bg-success-500"
                                                            : record.status === "failed"
                                                              ? "bg-error-500"
                                                              : record.status === "running"
                                                                ? "bg-warning-500"
                                                                : "bg-warning-400"
                                                    }`}
                                                />
                                                <span className="text-sm font-medium text-primary">
                                                    {record.triggeredBy === "auto" ? "Auto sync" : "Manual sync"}
                                                </span>
                                                <span className="text-xs text-tertiary">
                                                    +{record.filesAdded} added, ~{record.filesUpdated} updated, -{record.filesRemoved} removed
                                                </span>
                                            </div>
                                            <span className="text-xs text-quaternary">{formatDate(record.startedAt)}</span>
                                        </div>
                                        {record.errorMessage && (
                                            <p className="mt-2 text-xs text-error-600">{record.errorMessage}</p>
                                        )}
                                    </div>
                                ))}
                            {history.length > HISTORY_PER_PAGE && (
                                <div className="flex items-center justify-between pt-2">
                                    <p className="text-xs text-quaternary">
                                        Showing {historyPage * HISTORY_PER_PAGE + 1}–{Math.min((historyPage + 1) * HISTORY_PER_PAGE, history.length)} of {history.length}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setHistoryPage((p) => p - 1)}
                                            disabled={historyPage === 0}
                                            className="rounded-lg border border-secondary px-3 py-1.5 text-xs font-medium text-tertiary transition-colors hover:bg-secondary disabled:opacity-40"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setHistoryPage((p) => p + 1)}
                                            disabled={(historyPage + 1) * HISTORY_PER_PAGE >= history.length}
                                            className="rounded-lg border border-secondary px-3 py-1.5 text-xs font-medium text-tertiary transition-colors hover:bg-secondary disabled:opacity-40"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
