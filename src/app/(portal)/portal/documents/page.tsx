"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCategoryLabel } from "@/types";

interface DocItem {
    _id: string;
    title: string;
    category: string;
    mimeType: string;
    sizeBytes: number;
    viewCount: number;
    lastSyncedAt: string;
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<DocItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/documents")
            .then((r) => r.json())
            .then((data) => setDocuments(data.documents || []))
            .finally(() => setLoading(false));
    }, []);

    // Group by category
    const grouped: Record<string, DocItem[]> = {};
    for (const doc of documents) {
        if (!grouped[doc.category]) grouped[doc.category] = [];
        grouped[doc.category].push(doc);
    }

    const formatSize = (bytes: number) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getMimeIcon = (mime: string) => {
        if (mime.includes("pdf")) return "PDF";
        if (mime.includes("video")) return "VIDEO";
        if (mime.includes("spreadsheet") || mime.includes("excel")) return "XLS";
        if (mime.includes("presentation") || mime.includes("powerpoint")) return "PPT";
        return "DOC";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <p className="text-md text-tertiary">Loading documents...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-display-xs font-semibold text-primary">Documents</h1>
                <p className="mt-2 text-md text-tertiary">
                    Browse all investor materials organized by category.
                </p>
            </div>

            {documents.length === 0 ? (
                <div className="relative overflow-hidden rounded-2xl border border-paper-rule bg-paper-card px-8 py-20 text-center">
                    {/* Soft brand wash behind the illustration */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-72 w-72 rounded-full bg-brand-50 opacity-60 blur-3xl"
                    />
                    {/* Stacked-documents illustration in the brand palette */}
                    <div className="relative mx-auto h-24 w-24">
                        <div className="absolute left-1/2 top-2 h-20 w-16 -translate-x-1/2 rotate-[-8deg] rounded-md border border-brand-200 bg-paper-cream shadow-sm" />
                        <div className="absolute left-1/2 top-1 h-20 w-16 -translate-x-1/2 rotate-[5deg] rounded-md border border-brand-300 bg-paper-card shadow-sm" />
                        <div className="absolute left-1/2 top-0 flex h-20 w-16 -translate-x-1/2 flex-col items-center justify-center rounded-md border border-brand-400 bg-brand-50 shadow-md">
                            <div className="mb-1 h-1 w-8 rounded-full bg-brand-300" />
                            <div className="mb-1 h-1 w-7 rounded-full bg-brand-200" />
                            <div className="mb-1 h-1 w-8 rounded-full bg-brand-200" />
                            <div className="h-1 w-5 rounded-full bg-brand-200" />
                        </div>
                    </div>
                    <p className="relative mt-8 text-lg font-semibold text-primary">No documents yet</p>
                    <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-tertiary">
                        Documents will appear here as soon as the team uploads them. Check back shortly, or use
                        the chat below to ask about anything in the data room so far.
                    </p>
                </div>
            ) : (
                Object.entries(grouped).map(([category, docs]) => (
                    <section key={category} className="mb-10">
                        <h2 className="mb-4 text-lg font-semibold text-primary">
                            {getCategoryLabel(category)}
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {docs.map((doc) => (
                                <Link
                                    key={doc._id}
                                    href={`/portal/documents/${doc._id}`}
                                    className="group rounded-xl border border-secondary bg-primary p-5 shadow-xs transition-all hover:border-brand-200 hover:shadow-md"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">
                                            {getMimeIcon(doc.mimeType)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="truncate text-sm font-semibold text-primary group-hover:text-brand-700">
                                                {doc.title}
                                            </h3>
                                            <div className="mt-1 flex items-center gap-3 text-xs text-quaternary">
                                                {doc.sizeBytes > 0 && <span>{formatSize(doc.sizeBytes)}</span>}
                                                {doc.viewCount > 0 && <span>{doc.viewCount} views</span>}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                ))
            )}
        </div>
    );
}
