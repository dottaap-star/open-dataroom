export type UserRole = "investor" | "admin";

export interface User {
    _id: string;
    email: string;
    name: string;
    role: UserRole;
    isActive: boolean;
    lastLogin: string | null;
    createdAt: string;
}

export interface Invite {
    _id: string;
    email: string;
    name?: string;
    token: string;
    status: "pending" | "accepted" | "expired";
    invitedBy: string;
    sentAt: string;
    acceptedAt?: string;
    expiresAt: string;
}

export interface Document {
    _id: string;
    driveFileId?: string;
    title: string;
    description?: string;
    category: string;
    mimeType: string;
    sizeBytes: number;
    s3Key: string;
    cdnUrl?: string;
    pageCount?: number;
    thumbnailUrl?: string;
    lastSyncedAt?: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

import { config } from "@/config";

/**
 * Looks up the display label for a category slug. Priority:
 *   1. `config.documents.categoryLabels[slug]` (forker-tunable)
 *   2. Auto-derived Title Case from the slug
 *
 * This is the only escape hatch for category naming. Categories are derived
 * from the Drive folder structure + `dataroom.config.ts`; nothing is hardcoded.
 */
export function getCategoryLabel(slug: string): string {
    return (
        config.documents.categoryLabels[slug] ||
        slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    );
}

export interface AccessLog {
    _id: string;
    userId: string;
    userName: string;
    userEmail: string;
    action: "login" | "view_document" | "download_document" | "chat_message" | "page_view";
    resourceId?: string;
    resourceType?: string;
    resourceName?: string;
    metadata?: Record<string, unknown>;
    ip: string;
    userAgent: string;
    timestamp: string;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    sourcesCited?: { documentTitle: string; page?: number }[];
    timestamp: string;
}

export interface SyncHistory {
    _id: string;
    triggeredBy: "manual" | "auto" | "webhook";
    filesAdded: number;
    filesUpdated: number;
    filesRemoved: number;
    status: "success" | "partial" | "failed";
    errorMessage?: string;
    startedAt: string;
    completedAt?: string;
}
