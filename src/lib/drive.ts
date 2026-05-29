import { google } from "googleapis";
import type { Readable } from "stream";
import { config } from "@/config";

/**
 * Google Workspace MIME types that need export for viewing.
 * Docs → PDF, Sheets → XLSX (with CSV fallback in `getFileContent`),
 * Slides → PDF.
 */
const EXPORT_TYPES: Record<string, string> = {
    "application/vnd.google-apps.document": "application/pdf",
    "application/vnd.google-apps.spreadsheet": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.google-apps.presentation": "application/pdf",
};

/**
 * Documented fan-out folder name. A top-level Drive folder called "Shared"
 * (case-insensitive after slugify) is fanned out to every configured tier
 * — same files visible regardless of which tier the investor is on. This is
 * a convention (like the filename `.gitignore`), not a config field.
 */
const SHARED_FOLDER_SLUG = "shared";

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    size?: string;
    category: string;
    parentFolderName: string;
    /**
     * For configured tiers: the canonical `tier.id` from config.
     * For Shared: the literal "shared" — sync.ts fans this out to all tiers.
     * Never the raw folder slug.
     */
    tier: string;
    webViewLink?: string;
}

export interface ListFilesResult {
    files: DriveFile[];
    /**
     * Human-readable warnings (skipped ghost-tier folders, etc.) — sync.ts
     * folds these into `SyncHistory.details` so they surface in the admin UI.
     */
    warnings: string[];
}

function slugify(s: string): string {
    return s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function getAuth() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!email || !key) {
        throw new Error("Google service account credentials not configured");
    }

    const decodedKey = Buffer.from(key, "base64").toString("utf-8");

    return new google.auth.JWT({
        email,
        key: decodedKey,
        scopes: [
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/spreadsheets.readonly",
        ],
    });
}

function getDrive() {
    return google.drive({ version: "v3", auth: getAuth() });
}

async function listSubfolders(folderId: string): Promise<{ id: string; name: string }[]> {
    const drive = getDrive();
    const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name)",
    });
    return (res.data.files || []).filter((f) => f.id && f.name).map((f) => ({ id: f.id!, name: f.name! }));
}

async function listFilesInFolder(folderId: string) {
    const drive = getDrive();
    const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name, mimeType, modifiedTime, size, webViewLink)",
    });
    return (res.data.files || [])
        .filter((f) => f.id && f.name && f.mimeType)
        .map((f) => ({
            id: f.id!,
            name: f.name!,
            mimeType: f.mimeType!,
            modifiedTime: f.modifiedTime || new Date().toISOString(),
            size: f.size || "0",
            webViewLink: f.webViewLink || undefined,
        }));
}

/**
 * Tries to match a Drive folder name to a configured tier. Permissive: a
 * folder named either "growth" (matches tier.id) OR "Growth Round" (matches
 * slugify(tier.label)) both resolve to the same tier. Returns the canonical
 * `tier.id` on match, or null when the folder doesn't correspond to any
 * configured tier (ghost tier — sync skips with a warning).
 */
function matchTier(folderName: string): string | null {
    const folderSlug = slugify(folderName);
    if (folderSlug === SHARED_FOLDER_SLUG) return SHARED_FOLDER_SLUG;
    for (const tier of config.access.tiers) {
        if (folderSlug === tier.id || folderSlug === slugify(tier.label)) {
            return tier.id;
        }
    }
    return null;
}

/**
 * List all files across tier and category subfolders.
 *
 * Two conventions, switched by config:
 *
 * **Multi-tier mode** (`config.access.tiers.length > 0`):
 *   `root → tier folders → category folders → files` (plus an optional
 *   `Shared/` top-level folder that fans out to every configured tier).
 *   Unmatched tier folders are SKIPPED with a warning rather than promoted
 *   to implicit tiers no investor can read.
 *
 * **No-tier mode** (`config.access.tiers.length === 0`):
 *   `root → category folders → files`. All documents get `tiers: []` and
 *   every authenticated investor sees everything. Tier-named subfolders
 *   are NOT honoured here — the convention collapses one level.
 */
export async function listAllFiles(rootFolderId: string): Promise<ListFilesResult> {
    const warnings: string[] = [];
    const allFiles: DriveFile[] = [];

    if (config.access.tiers.length === 0) {
        // No-tier mode: root → category folders → files.
        const categoryFolders = await listSubfolders(rootFolderId);
        for (const categoryFolder of categoryFolders) {
            const categorySlug = slugify(categoryFolder.name);
            const files = await listFilesInFolder(categoryFolder.id);
            for (const file of files) {
                allFiles.push({
                    ...file,
                    category: categorySlug,
                    parentFolderName: categoryFolder.name,
                    tier: "",
                });
            }
        }
        // Files directly under root (no category folder)
        const directFiles = await listFilesInFolder(rootFolderId);
        for (const file of directFiles) {
            allFiles.push({
                ...file,
                category: "general",
                parentFolderName: "",
                tier: "",
            });
        }
        return { files: allFiles, warnings };
    }

    // Multi-tier mode: root → tier folders → category folders → files.
    const tierFolders = await listSubfolders(rootFolderId);

    for (const tierFolder of tierFolders) {
        const matched = matchTier(tierFolder.name);
        if (matched === null) {
            warnings.push(
                `Skipped folder "${tierFolder.name}": doesn't match any configured tier (config.access.tiers). Add a tier with this id/label, or move the folder under a configured tier.`
            );
            continue;
        }
        const tierId = matched;
        const categoryFolders = await listSubfolders(tierFolder.id);

        for (const categoryFolder of categoryFolders) {
            const categorySlug = slugify(categoryFolder.name);
            const files = await listFilesInFolder(categoryFolder.id);
            for (const file of files) {
                allFiles.push({
                    ...file,
                    category: categorySlug,
                    parentFolderName: categoryFolder.name,
                    tier: tierId,
                });
            }
        }

        // Files directly in the tier folder (no category subfolder)
        const directFiles = await listFilesInFolder(tierFolder.id);
        for (const file of directFiles) {
            allFiles.push({
                ...file,
                category: "general",
                parentFolderName: tierFolder.name,
                tier: tierId,
            });
        }
    }

    return { files: allFiles, warnings };
}

/**
 * Get file content as a Buffer for viewing.
 * Google Workspace files are exported as PDF.
 * Regular files are downloaded directly.
 */
export async function getFileContent(fileId: string, mimeType: string): Promise<{ buffer: Buffer; contentType: string }> {
    const drive = getDrive();
    const exportMime = EXPORT_TYPES[mimeType];

    if (exportMime) {
        try {
            const res = await drive.files.export(
                { fileId, mimeType: exportMime },
                { responseType: "stream" }
            );
            const buffer = await streamToBuffer(res.data as Readable);
            return { buffer, contentType: exportMime };
        } catch {
            // Some files don't support XLSX export, fall back to CSV for spreadsheets
            if (mimeType === "application/vnd.google-apps.spreadsheet") {
                const res = await drive.files.export(
                    { fileId, mimeType: "text/csv" },
                    { responseType: "stream" }
                );
                const buffer = await streamToBuffer(res.data as Readable);
                return { buffer, contentType: "text/csv" };
            }
            throw new Error(`Export failed for ${mimeType}`);
        }
    } else {
        const res = await drive.files.get(
            { fileId, alt: "media" },
            { responseType: "stream" }
        );
        const buffer = await streamToBuffer(res.data as Readable);
        return { buffer, contentType: mimeType };
    }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}

/**
 * Get computed cell values for a specific sheet using the Sheets API.
 * Returns a 2D array of strings (all formulas are computed).
 */
export async function getSheetValues(fileId: string, sheetName: string): Promise<string[][]> {
    const sheets = google.sheets({ version: "v4", auth: getAuth() });
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: `'${sheetName}'`,
        valueRenderOption: "FORMATTED_VALUE",
    });
    return (res.data.values || []) as string[][];
}

export function isGoogleWorkspaceFile(mimeType: string): boolean {
    return mimeType in EXPORT_TYPES;
}

export function getOutputMimeType(mimeType: string): string {
    return EXPORT_TYPES[mimeType] || mimeType;
}
