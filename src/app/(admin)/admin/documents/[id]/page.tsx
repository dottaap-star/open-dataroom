"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { getCategoryLabel } from "@/types";

interface DocMeta {
    id: string;
    title: string;
    category: string;
    mimeType: string;
    originalMimeType?: string;
    sizeBytes: number;
    viewCount: number;
    allowDownload: boolean;
}

export default function AdminDocumentViewerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [doc, setDoc] = useState<DocMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch(`/api/documents/${id}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.error) {
                    setError(data.error);
                } else {
                    setDoc(data.document);
                }
            })
            .catch(() => setError("Failed to load document"))
            .finally(() => setLoading(false));
    }, [id]);

    const toggleSetting = async (field: "allowDownload" | "watermarkEnabled", value: boolean) => {
        if (!doc) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/documents/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: value }),
            });
            if (res.ok) {
                setDoc({ ...doc, [field]: value });
            }
        } catch {
            // Silent fail
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <p className="text-md text-tertiary">Loading document...</p>
            </div>
        );
    }

    if (error || !doc) {
        return (
            <div className="py-20 text-center">
                <p className="text-md text-error-600">{error || "Document not found"}</p>
                <Link href="/admin/documents" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
                    Back to documents
                </Link>
            </div>
        );
    }

    const isVideo = doc.mimeType.startsWith("video/");
    const isPdf = doc.mimeType === "application/pdf";
    const isSpreadsheet = doc.originalMimeType === "application/vnd.google-apps.spreadsheet" ||
        doc.originalMimeType?.includes("spreadsheet") ||
        doc.originalMimeType?.includes("excel");
    const viewUrl = `/api/documents/${id}?view=true`;

    return (
        <div>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/documents"
                        className="flex items-center gap-1 text-sm font-medium text-tertiary hover:text-primary"
                    >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Back
                    </Link>
                    <span className="text-tertiary">/</span>
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                        {getCategoryLabel(doc.category)}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-tertiary">
                    <span>{doc.viewCount} views</span>
                </div>
            </div>

            <h1 className="mb-4 text-lg font-semibold text-primary">{doc.title}</h1>

            {/* Download settings */}
            <div className="mb-4 flex items-center gap-6 rounded-lg border border-secondary bg-primary px-4 py-3">
                <label className="flex items-center gap-2.5 text-sm">
                    <button
                        type="button"
                        role="switch"
                        aria-checked={doc.allowDownload}
                        disabled={saving}
                        onClick={() => toggleSetting("allowDownload", !doc.allowDownload)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                            doc.allowDownload ? "bg-brand-600" : "bg-gray-200"
                        } disabled:opacity-50`}
                    >
                        <span className={`inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform ${
                            doc.allowDownload ? "translate-x-4" : "translate-x-0.5"
                        }`} />
                    </button>
                    <span className="font-medium text-primary">Allow downloads</span>
                </label>

            </div>

            {/* Viewer */}
            {isSpreadsheet ? (
                <div
                    className="overflow-auto rounded-xl border border-secondary bg-white shadow-xs"
                    style={{ height: "calc(100vh - 300px)" }}
                >
                    <iframe
                        src={viewUrl}
                        className="size-full"
                        title={doc.title}
                        style={{ minWidth: "100%", minHeight: "100%" }}
                    />
                </div>
            ) : isPdf ? (
                <div
                    className="overflow-hidden rounded-xl border border-secondary shadow-xs"
                    style={{ height: "calc(100vh - 300px)" }}
                >
                    <iframe
                        src={viewUrl}
                        className="size-full"
                        title={doc.title}
                    />
                </div>
            ) : isVideo ? (
                <div className="overflow-hidden rounded-xl border border-secondary shadow-xs">
                    <video controls className="w-full">
                        <source src={viewUrl} type={doc.mimeType} />
                        Your browser does not support video playback.
                    </video>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-secondary shadow-xs">
                    <iframe
                        src={viewUrl}
                        className="size-full"
                        style={{ height: "calc(100vh - 300px)" }}
                        title={doc.title}
                    />
                </div>
            )}
        </div>
    );
}
