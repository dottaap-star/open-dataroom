import { connectDB } from "./db";
import { listAllFiles, getOutputMimeType } from "./drive";
import { DocumentModel } from "./models/document";
import { SyncHistory } from "./models/sync-history";
import { config } from "@/config";

/**
 * Sync metadata from Google Drive to MongoDB.
 *
 * No file bytes are copied — documents are streamed direct from Drive on
 * demand. Concurrent runs are made idempotent by the unique index on
 * `Document.driveFileId` (defined in `src/lib/models/document.ts`); the
 * upsert path here relies on that to avoid double-inserting the same file
 * when two sync triggers race.
 */
export async function syncFromDrive(triggeredBy: "manual" | "auto" | "webhook" = "manual") {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
        throw new Error("GOOGLE_DRIVE_FOLDER_ID not configured");
    }

    await connectDB();

    const syncRecord = await SyncHistory.create({
        triggeredBy,
        startedAt: new Date(),
    });

    let filesAdded = 0;
    let filesUpdated = 0;
    let filesRemoved = 0;
    const details: string[] = [];
    // Set to true by branches that have already persisted a terminal status
    // on `syncRecord` (e.g. the empty-Drive guard). Prevents the outer catch
    // from overwriting that status with its generic "partial-or-failed"
    // heuristic when those branches re-throw.
    let syncRecordFinalized = false;

    try {
        console.log("Listing files from Google Drive...");
        const { files: driveFiles, warnings } = await listAllFiles(folderId);
        console.log(`Found ${driveFiles.length} files in Drive`);
        // Surface ghost-tier / skipped-folder warnings to the admin UI.
        for (const w of warnings) details.push(`Warning: ${w}`);

        // The configured tier ids — the universe of valid `tiers[]` values
        // we'll persist on each Document row. In no-tier mode this is `[]`
        // and every doc ends up with an empty `tiers` array.
        const ALL_TIERS = config.access.tiers.map((t) => t.id);

        // Merge tiers for files that appear in multiple tier folders (or shared)
        const fileMap = new Map<string, { file: typeof driveFiles[0]; tiers: Set<string> }>();
        for (const file of driveFiles) {
            const existing = fileMap.get(file.id);
            // Empty tier (no-tier mode) or "shared" both resolve to "all configured tiers".
            // For no-tier mode that's [] — the file is universally visible without a filter.
            const fileTiers =
                file.tier === "shared"
                    ? ALL_TIERS
                    : file.tier === ""
                        ? []
                        : [file.tier];
            if (existing) {
                fileTiers.forEach((t) => existing.tiers.add(t));
            } else {
                fileMap.set(file.id, { file, tiers: new Set(fileTiers) });
            }
        }

        const driveFileIds = new Set(fileMap.keys());

        const existingDocs = await DocumentModel.find().lean();

        // Empty-Drive guard: if Drive returned zero usable files AND we have
        // existing docs, refuse to mass-soft-delete. The catastrophic case is
        // a broken Drive token / wrong folder id wiping out a populated DB.
        // Empty-and-empty (fresh install) is a legitimate no-op.
        if (fileMap.size === 0 && existingDocs.length > 0) {
            const msg = `Drive returned zero files but ${existingDocs.length} documents exist in DB. Refusing to mass-soft-delete. Verify GOOGLE_DRIVE_FOLDER_ID and service-account access.`;
            console.error(`Sync aborted: ${msg}`);
            syncRecord.status = "failed";
            syncRecord.errorMessage = msg;
            syncRecord.filesAdded = 0;
            syncRecord.filesUpdated = 0;
            syncRecord.filesRemoved = 0;
            syncRecord.details = details;
            syncRecord.completedAt = new Date();
            await syncRecord.save();
            syncRecordFinalized = true;
            throw new Error(msg);
        }

        const existingByDriveId = new Map(existingDocs.map((d) => [d.driveFileId, d]));

        for (const [fileId, { file, tiers }] of fileMap) {
            try {
                const existing = existingByDriveId.get(fileId);
                const driveModified = new Date(file.modifiedTime);
                const outputMimeType = getOutputMimeType(file.mimeType);
                const title = file.name.replace(/\.(pdf|docx?|xlsx?|pptx?|csv|txt|mp4|mov|avi|mkv|png|jpe?g|gif|svg|zip)$/i, "");
                const tierArray = Array.from(tiers).sort();

                // Skip if file hasn't changed, is still active, and metadata matches
                if (existing && existing.isActive && existing.driveModifiedAt >= driveModified
                    && existing.title === title && existing.mimeType === outputMimeType
                    && JSON.stringify((existing.tiers || []).sort()) === JSON.stringify(tierArray)) {
                    continue;
                }

                if (existing) {
                    await DocumentModel.findByIdAndUpdate(existing._id, {
                        title,
                        category: file.category,
                        mimeType: outputMimeType,
                        originalMimeType: file.mimeType,
                        sizeBytes: parseInt(file.size || "0", 10),
                        tiers: tierArray,
                        driveModifiedAt: driveModified,
                        lastSyncedAt: new Date(),
                        isActive: true,
                    });
                    filesUpdated++;
                    details.push(`Updated: ${file.name} [${tierArray.join(", ") || "no-tier"}]`);
                } else {
                    await DocumentModel.create({
                        driveFileId: fileId,
                        title,
                        category: file.category,
                        mimeType: outputMimeType,
                        originalMimeType: file.mimeType,
                        sizeBytes: parseInt(file.size || "0", 10),
                        s3Key: "",
                        tiers: tierArray,
                        driveModifiedAt: driveModified,
                        lastSyncedAt: new Date(),
                        isActive: true,
                        sortOrder: 0,
                    });
                    filesAdded++;
                    details.push(`Added: ${file.name} [${tierArray.join(", ") || "no-tier"}]`);
                }
            } catch (fileErr) {
                const msg = fileErr instanceof Error ? fileErr.message : String(fileErr);
                console.error(`Error processing ${file.name}:`, msg);
                details.push(`Error: ${file.name} - ${msg}`);
            }
        }

        // Mark removed files as inactive (only if currently active)
        for (const doc of existingDocs) {
            if (doc.isActive && !driveFileIds.has(doc.driveFileId)) {
                await DocumentModel.findByIdAndUpdate(doc._id, { isActive: false });
                filesRemoved++;
                details.push(`Removed: ${doc.title}`);
            }
        }

        syncRecord.filesAdded = filesAdded;
        syncRecord.filesUpdated = filesUpdated;
        syncRecord.filesRemoved = filesRemoved;
        syncRecord.status = "success";
        syncRecord.details = details;
        syncRecord.completedAt = new Date();
        await syncRecord.save();

        console.log(`Sync complete: ${filesAdded} added, ${filesUpdated} updated, ${filesRemoved} removed`);

        return { filesAdded, filesUpdated, filesRemoved, details, status: "success" as const };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Sync failed:", msg);

        if (!syncRecordFinalized) {
            syncRecord.status = details.length > 0 ? "partial" : "failed";
            syncRecord.errorMessage = msg;
            syncRecord.filesAdded = filesAdded;
            syncRecord.filesUpdated = filesUpdated;
            syncRecord.filesRemoved = filesRemoved;
            syncRecord.details = details;
            syncRecord.completedAt = new Date();
            await syncRecord.save();
        }

        throw err;
    }
}
