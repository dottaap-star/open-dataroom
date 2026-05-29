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
    allowDownload?: boolean;
}

export default function DocumentViewerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [doc, setDoc] = useState<DocMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
                <Link href="/portal/documents" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
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
    const pdfViewUrl = `${viewUrl}#toolbar=0&navpanes=0`;

    return (
        <div>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/portal/documents"
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
                {doc.allowDownload && (
                    <a
                        href={`/api/documents/${id}?download=true`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-medium text-white shadow-xs transition-colors hover:bg-brand-700"
                    >
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download
                    </a>
                )}
            </div>

            <h1 className="mb-4 text-lg font-semibold text-primary">{doc.title}</h1>

            {/* Viewer */}
            {isSpreadsheet ? (
                <div
                    className="overflow-auto rounded-xl border border-secondary bg-white shadow-xs"
                    style={{ height: "calc(100vh - 240px)" }}
                    onContextMenu={(e) => e.preventDefault()}
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
                    style={{ height: "calc(100vh - 240px)" }}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <iframe
                        src={pdfViewUrl}
                        className="size-full"
                        title={doc.title}
                        style={{ userSelect: "none" }}
                    />
                </div>
            ) : isVideo ? (
                <div className="overflow-hidden rounded-xl border border-secondary shadow-xs">
                    <video
                        controls
                        controlsList="nodownload"
                        className="w-full"
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <source src={viewUrl} type={doc.mimeType} />
                        Your browser does not support video playback.
                    </video>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-secondary shadow-xs">
                    <iframe
                        src={viewUrl}
                        className="size-full"
                        style={{ height: "calc(100vh - 240px)" }}
                        title={doc.title}
                    />
                </div>
            )}
        </div>
    );
}
