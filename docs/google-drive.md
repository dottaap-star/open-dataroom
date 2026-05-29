# Google Drive integration

The template treats Drive as the canonical document store. Investors view PDFs and spreadsheets that originate in Drive; the admin uploads, organises, and re-syncs through the Drive UI, not through the data room. The data room is a read-mirror.

This is by design: investors look at finalised documents; founders work on documents in Drive. Decoupling the two means you don't need to upload through a clunky form, and you don't need to redeploy when you swap a typo'd PDF.

## Service account setup

You need a Google Cloud project, a service account, and a shared Drive folder. About 10 minutes.

1. **Create a GCP project** (or use an existing one). https://console.cloud.google.com/projectcreate
2. **Enable the Google Drive API.** APIs & Services → Library → search "Google Drive API" → Enable.
3. **Create a service account.** IAM & Admin → Service Accounts → Create. Give it a name like `open-dataroom-sync`. Skip the optional grant steps — we don't need IAM roles.
4. **Generate a JSON key.** Service account → Keys → Add Key → Create new key → JSON. Save the file somewhere safe.
5. **Extract two values from the JSON:**
   - `client_email` (looks like `open-dataroom-sync@your-project.iam.gserviceaccount.com`)
   - `private_key` (a multi-line PEM block starting with `-----BEGIN PRIVATE KEY-----`)
6. **Encode the private key for env.** The simplest path is base64:
   ```bash
   cat the-key.json | jq -r .private_key | base64
   ```
   Paste the base64 string as `GOOGLE_SERVICE_ACCOUNT_KEY` in `.env.local`. The Drive client decodes it back to PEM at startup. This avoids the multi-line-string-in-dotenv ergonomic nightmare.
7. **Create a Drive folder** to hold your data room contents. Note its ID — it's the alphanumeric string at the end of the URL when you open the folder (`https://drive.google.com/drive/folders/THIS_PART`).
8. **Share the folder with the service account email** (the `client_email` from step 5) with **Viewer** access. Read-only is sufficient — the template never writes to Drive.
9. **Paste the folder ID** as `GOOGLE_DRIVE_FOLDER_ID` in `.env.local`.

Run `npm run check` to verify; it lists the folder contents on success.

## Folder convention

Drive's folder structure maps directly to the data room's tier and category structure. Two layers:

```
<root-folder>/
├── seed/                      ← tier "seed" (matches config.access.tiers[].id)
│   ├── Pitch Deck/            ← category "pitch-deck" (slug-derived)
│   │   ├── Pitch Deck.pdf
│   │   └── Pitch Deck v2.pdf
│   └── Business Plan/         ← category "business-plan"
│       └── BP-2026.pdf
├── growth/                    ← tier "growth"
│   ├── Financial Model/
│   │   └── Model.xlsx
│   └── Commercial Traction/
│       └── Q4-update.pdf
└── Shared/                    ← special — fans out across all tiers
    ├── Team/
    │   └── Team bios.pdf
    └── Cap Table/
        └── Cap Table 2026.pdf
```

The sync walks two levels deep:
- Level 1 folder name → tier id (lowercase, alphanumeric + hyphens)
- Level 2 folder name → category slug (same derivation)
- Files inside level 2 → `Document` rows

**Files at the root of the root folder** are skipped. The sync logs a warning for each, listing the filename. (We don't auto-assign them because we don't know which tier they should belong to.)

**Files at level 1** (inside a tier folder but not in a category subfolder) are skipped with a similar warning.

**Subfolders below level 2** are skipped. The sync doesn't recurse. Flatten your structure if you want deeper organisation, or use category slugs to encode hierarchy (`legal-contracts`, `legal-corp-docs`).

## `Shared/` semantics

A top-level folder named **exactly** `Shared` (case-sensitive) is special in multi-tier mode: its contents fan out to every tier. A `Shared/Cap Table/foo.pdf` becomes one `Document` row visible to every approved investor regardless of their tier.

**In no-tier mode** (`config.access.tiers = []`), a `Shared/` folder is treated as a regular category called `"shared"`. No fan-out, just a regular two-level walk. Benign but counter-intuitive — call it out in your team docs.

This is the **(d) gotcha** from `customize.md`.

## How sync runs

Three triggers:

1. **Manual.** Admin clicks "Sync now" in the dashboard → POST `/api/admin/sync`.
2. **Cron.** Vercel Cron hits `/api/cron/sync` on the schedule in `vercel.json` (shipped default: `0 6 * * *` — daily at 06:00 UTC). The route requires `Authorization: Bearer $CRON_SECRET` — Vercel sets this header automatically when calling the route.
3. **Programmatic.** Anywhere in your code, `import { syncFromDrive } from "@/lib/sync"`.

What `syncFromDrive()` does:

1. List every file in every level-2 folder under the root.
2. Diff against current `documents` rows by Drive `fileId`.
3. **New file** → insert a `Document` row.
4. **Existing file with a newer `modifiedTime`** → update title, MIME type, size, modified date.
5. **File no longer in Drive** → soft-delete by flipping `isActive: false` (not hard-delete; not a `deletedAt` field).
6. Write a `SyncHistory` row with `startedAt`/`completedAt`, `filesAdded`, `filesUpdated`, `filesRemoved`, `status`, `errorMessage`, `details`.

Soft-delete preserves audit trail. To hard-delete, drop the row from `documents` manually (or run a cleanup cron).

## Empty-folder guard

If `syncFromDrive()` finds **zero documents** at the leaves AND the DB already holds at least one existing document, it stops before the diff stage and writes a `failed` SyncHistory with an error message mentioning `GOOGLE_DRIVE_FOLDER_ID` and service-account access. The guard exists because without it, a broken Drive token would mass-flip every existing document to `isActive: false` — interpreting an authentication mismatch as "all documents deleted" is the worst possible outcome.

**Fresh installs are exempted.** Empty Drive + empty DB is a legitimate no-op (the row records `status: success` with zero counts). The guard only fires on a populated DB.

**(i) The error message focuses on credentials**, but a renamed-tier-folder config drift is also a likely cause when the guard fires on an established deployment. Check the `details` field on the failed `SyncHistory` row for ghost-tier warnings showing which folders were skipped because they didn't match any configured tier.

The fix was added after a near-miss in the original codebase. Don't remove it.

## Re-indexing the knowledge base after sync

Sync only updates `documents`. It does NOT re-extract text or update RAG chunks. After a sync that added or modified documents, click "Re-index knowledge base" in the admin dashboard to fan out to `/api/admin/rag` → `ingest.ts` → process the new/changed documents through extract → chunk → embed → upsert.

This is two-step on purpose. Sync is cheap (one Drive API call). Re-index is expensive (embedding tokens). Bundling them would make every sync — including the cron one — burn embedding tokens whether anything changed or not. The SHA-256 dedup in `ingest.ts` would catch the unchanged-document case, but you'd still pay for the diff calculation and DB churn.

**Recommendation:** if you trust your authors, run re-index on a separate cron (e.g. 2 hours after sync). If your content changes rarely, do it manually after a known-content drop.

## Shared drives vs My Drive

The template was tested against folders shared with the service account from a personal My Drive. Shared Drives (formerly Team Drives) work too but require an extra step: the service account needs to be added as a member of the Shared Drive, not just shared on the folder. Otherwise the Drive API returns 404 on the folder ID.

If you're using a Shared Drive and getting "folder not found" errors, that's the cause.

## Drive API quotas

Default: 1,000 read requests per 100 seconds per service account. The sync walks the root folder + every tier + every category, then lists files in each leaf — for a typical data room (3 tiers × 5 categories), that's ~20 API calls per sync. At every-6-hour cadence you're nowhere near the limit.

You'll hit limits if:
- You crank cron frequency below ~5 minutes AND your document count is high.
- A single sync run encounters >1000 files across all folders.

If either applies, request a quota bump in the GCP console (usually granted within 24 hours, no payment).

## Backups

Drive itself is your backup. The data room has no concept of historical document versions — every sync overwrites with the latest. If you delete a document from Drive, it goes to Drive trash for 30 days, then gone forever. The data room's soft-delete preserves the `Document` row but not the file content.

If you need long-term archival, set up Google Vault on the Workspace account that owns the Drive, or `rsync` the folder to S3 with versioning on a schedule.

## Skipping Drive entirely

For deployments where the knowledge base lives only in markdown (Lighthouse Labs is the canonical example), you can skip Drive setup:

1. Don't set `GOOGLE_*` env vars (leave them unset, not "TODO").
2. The admin "Sync now" button still exists but errors usefully ("Drive integration not configured").
3. `/api/cron/sync` errors and does nothing — harmless on a cron.
4. Set `localKnowledge` in `dataroom.config.ts` to point at your markdown files.
5. Manually re-index from admin when content changes.

This is fully supported and exercised by the Lighthouse Labs example.
