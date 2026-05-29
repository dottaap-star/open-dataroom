import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DocumentModel } from "@/lib/models/document";
import { AccessLog } from "@/lib/models/access-log";
import { getFileContent, getSheetValues } from "@/lib/drive";
import { getCurrentUser } from "@/lib/auth";
import ExcelJS from "exceljs";

/**
 * GET /api/documents/[id] — Get document metadata
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const doc = await DocumentModel.findById(id);

        if (!doc || !doc.isActive) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        // Verify tier access for investors
        if (user.role === "investor" && user.tier && doc.tiers && doc.tiers.length > 0) {
            if (!doc.tiers.includes(user.tier)) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }
        }

        // Check request type
        const url = new URL(request.url);
        const isView = url.searchParams.get("view") === "true";
        const isDownload = url.searchParams.get("download") === "true";

        // Handle download request
        if (isDownload) {
            if (!doc.allowDownload) {
                return NextResponse.json({ error: "Downloads not enabled for this document" }, { status: 403 });
            }

            const { buffer, contentType } = await getFileContent(doc.driveFileId, doc.originalMimeType);

            // Log download
            await AccessLog.create({
                userId: user._id,
                userName: user.name,
                userEmail: user.email,
                action: "download_document",
                resourceId: doc._id.toString(),
                resourceType: "document",
                resourceName: doc.title,
                metadata: { category: doc.category },
                ip: request.headers.get("x-forwarded-for") || "unknown",
                userAgent: request.headers.get("user-agent") || "unknown",
            });

            // Determine filename and extension
            const ext = contentType === "application/pdf" ? ".pdf"
                : contentType.includes("spreadsheet") || contentType.includes("xlsx") ? ".xlsx"
                : contentType.startsWith("video/") ? `.${contentType.split("/")[1]}`
                : "";
            const filename = `${doc.title}${ext}`;

            return new NextResponse(new Uint8Array(buffer), {
                headers: {
                    "Content-Type": contentType,
                    "Content-Disposition": `attachment; filename="${filename}"`,
                    "Cache-Control": "private, no-cache",
                    "X-Content-Type-Options": "nosniff",
                },
            });
        }

        if (isView) {
            // Serve file content directly from Google Drive
            let { buffer, contentType } = await getFileContent(doc.driveFileId, doc.originalMimeType);

            // Convert spreadsheets to a styled HTML table for viewing
            const isXlsx = contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            const isCsv = contentType === "text/csv";
            if (isXlsx) {
                const html = await xlsxToHtml(buffer, doc.title, doc.driveFileId);
                buffer = Buffer.from(html, "utf-8");
                contentType = "text/html";
            } else if (isCsv) {
                const html = csvToHtmlTable(buffer.toString("utf-8"), doc.title);
                buffer = Buffer.from(html, "utf-8");
                contentType = "text/html";
            }

            // Log access
            await AccessLog.create({
                userId: user._id,
                userName: user.name,
                userEmail: user.email,
                action: "view_document",
                resourceId: doc._id.toString(),
                resourceType: "document",
                resourceName: doc.title,
                metadata: { category: doc.category },
                ip: request.headers.get("x-forwarded-for") || "unknown",
                userAgent: request.headers.get("user-agent") || "unknown",
            });

            // Increment view count
            doc.viewCount += 1;
            await doc.save();

            return new NextResponse(new Uint8Array(buffer), {
                headers: {
                    "Content-Type": contentType,
                    "Content-Disposition": "inline",
                    "Cache-Control": "private, no-cache",
                    "X-Content-Type-Options": "nosniff",
                },
            });
        }

        // Return metadata only
        return NextResponse.json({
            document: {
                id: doc._id,
                title: doc.title,
                category: doc.category,
                mimeType: doc.mimeType,
                originalMimeType: doc.originalMimeType,
                sizeBytes: doc.sizeBytes,
                pageCount: doc.pageCount,
                viewCount: doc.viewCount,
                allowDownload: doc.allowDownload ?? false,
                lastSyncedAt: doc.lastSyncedAt,
            },
        });
    } catch (err) {
        console.error("Document fetch error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * PATCH /api/documents/[id] — Update document settings (admin only)
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { requireAdmin } = await import("@/lib/auth");
        await requireAdmin();
        await connectDB();

        const body = await request.json();
        const updates: Record<string, unknown> = {};

        if (typeof body.allowDownload === "boolean") updates.allowDownload = body.allowDownload;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const doc = await DocumentModel.findByIdAndUpdate(id, updates, { new: true });
        if (!doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        return NextResponse.json({
            document: {
                id: doc._id,
                allowDownload: doc.allowDownload,
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        const status = message.includes("Unauthorized") ? 403 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function argbToHex(argb: string): string | null {
    if (!argb || argb === "00000000") return null;
    // ARGB format: FF003366 → #003366
    const hex = argb.length === 8 ? argb.substring(2) : argb;
    if (hex === "000000" || hex.length < 6) return null;
    return `#${hex}`;
}

function getFillColor(fill: ExcelJS.Fill | undefined): string | null {
    if (!fill || fill.type !== "pattern" || !fill.fgColor) return null;
    if (fill.fgColor.argb) return argbToHex(fill.fgColor.argb);
    if (fill.fgColor.theme !== undefined) return null; // Theme colors need a palette lookup
    return null;
}

function getFontColor(font: Partial<ExcelJS.Font> | undefined): string | null {
    if (!font?.color) return null;
    if (font.color.argb) return argbToHex(font.color.argb);
    return null;
}

function getAlignment(alignment: Partial<ExcelJS.Alignment> | undefined): string {
    if (!alignment?.horizontal) return "";
    return `text-align:${alignment.horizontal};`;
}

function getCellStyle(cell: ExcelJS.Cell): string {
    const styles: string[] = [];

    const bgColor = getFillColor(cell.fill as ExcelJS.Fill);
    if (bgColor) styles.push(`background:${bgColor}`);

    const fontColor = getFontColor(cell.font);
    if (fontColor) styles.push(`color:${fontColor}`);

    if (cell.font?.bold) styles.push("font-weight:700");
    if (cell.font?.italic) styles.push("font-style:italic");
    if (cell.font?.size) styles.push(`font-size:${cell.font.size}px`);

    const align = getAlignment(cell.alignment);
    if (align) styles.push(align);

    return styles.length > 0 ? ` style="${styles.join(";")}"` : "";
}

function formatNumber(num: number, fmt: string | undefined): string {
    if (!fmt || fmt === "General") return escapeHtml(String(num));

    const isPercent = fmt.includes("%");
    const hasDollar = fmt.includes("$");
    const hasPound = fmt.includes("£");
    const isAccounting = fmt.includes("_") || fmt.includes("#,##0");

    // Count decimal places from format
    const decMatch = fmt.match(/\.(0+)/);
    const decimals = decMatch ? decMatch[1].length : (fmt.includes(".") ? 2 : 0);

    let formatted: string;
    if (isPercent) {
        formatted = (num * 100).toFixed(decimals) + "%";
    } else {
        const absNum = Math.abs(num);
        const numStr = isAccounting || hasDollar || hasPound
            ? absNum.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
            : absNum.toFixed(decimals);

        const prefix = hasDollar ? "$" : hasPound ? "£" : "";
        formatted = num < 0 ? `-${prefix}${numStr}` : `${prefix}${numStr}`;
    }

    return escapeHtml(formatted);
}

function formatDate(date: Date): string {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const m = months[date.getMonth()];
    const y = String(date.getFullYear()).slice(-2);
    return `${m}-${y}`;
}

function isErrorValue(val: unknown): boolean {
    if (typeof val === "object" && val !== null && "error" in val) return true;
    if (typeof val === "string" && val.startsWith("#")) return true;
    return false;
}

function resolveValue(val: ExcelJS.CellValue): string | number | boolean | Date | null {
    if (val === null || val === undefined) return null;
    if (isErrorValue(val)) return null; // errors in CSV-fallback sheets won't reach here
    if (typeof val === "object" && "result" in val) {
        const result = (val as ExcelJS.CellFormulaValue).result;
        if (isErrorValue(result)) return null;
        if (result instanceof Date) return result;
        if (typeof result === "object" && result !== null && "result" in result) {
            const nested = (result as unknown as { result: unknown }).result;
            if (isErrorValue(nested)) return null;
            return nested as string | number | boolean | null;
        }
        return result as string | number | boolean | null;
    }
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return val;
    if (val instanceof Date) return val;
    return null;
}

function getCellValue(cell: ExcelJS.Cell): string {
    const val = cell.value;
    if (val === null || val === undefined) return "";
    if (typeof val === "object" && "richText" in val) {
        return (val as ExcelJS.CellRichTextValue).richText.map((r) => escapeHtml(String(r.text))).join("");
    }

    const resolved = resolveValue(val);
    if (resolved === null) return "";

    if (resolved instanceof Date) {
        return escapeHtml(formatDate(resolved));
    }

    if (typeof resolved === "number") {
        return formatNumber(resolved, cell.numFmt);
    }

    return escapeHtml(String(resolved));
}

function sheetHasErrors(sheet: ExcelJS.Worksheet): boolean {
    let hasError = false;
    sheet.eachRow((row) => {
        if (hasError) return;
        row.eachCell((cell) => {
            if (hasError) return;
            const val = cell.value;
            if (isErrorValue(val)) { hasError = true; return; }
            if (typeof val === "object" && val !== null && "result" in val) {
                const result = (val as ExcelJS.CellFormulaValue).result;
                if (isErrorValue(result)) { hasError = true; return; }
            }
        });
    });
    return hasError;
}

function renderValuesSheet(values: string[][]): string {
    const rows = values.map((row) => {
        return `<tr>${row.map((c) => `<td>${escapeHtml(String(c ?? ""))}</td>`).join("")}</tr>`;
    }).join("");
    return `<table>${rows}</table>`;
}

function renderSheet(sheet: ExcelJS.Worksheet): string {
    // Build merge map
    const mergeMap = new Map<string, { colspan: number; rowspan: number }>();
    const hiddenCells = new Set<string>();

    for (const mergeRange of Object.values(sheet.model.merges || [])) {
        const [start, end] = String(mergeRange).split(":");
        const startCell = sheet.getCell(start);
        const endCell = sheet.getCell(end);
        const startRow = Number(startCell.row);
        const startCol = Number(startCell.col);
        const endRow = Number(endCell.row);
        const endCol = Number(endCell.col);

        const colspan = endCol - startCol + 1;
        const rowspan = endRow - startRow + 1;

        mergeMap.set(`${startRow}:${startCol}`, { colspan, rowspan });
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                if (r !== startRow || c !== startCol) {
                    hiddenCells.add(`${r}:${c}`);
                }
            }
        }
    }

    // Find actual data bounds
    let maxCol = 1;
    let maxRow = 1;
    sheet.eachRow((row, rowNum) => {
        maxRow = Math.max(maxRow, rowNum);
        row.eachCell((_, colNum) => {
            maxCol = Math.max(maxCol, colNum);
        });
    });

    // Build column widths
    const colWidths: string[] = [];
    for (let c = 1; c <= maxCol; c++) {
        const col = sheet.getColumn(c);
        const w = col.width ? Math.round(col.width * 8) : 100;
        colWidths.push(`<col style="width:${w}px">`);
    }

    // Build rows
    const rows: string[] = [];
    for (let r = 1; r <= maxRow; r++) {
        const row = sheet.getRow(r);
        const cells: string[] = [];

        for (let c = 1; c <= maxCol; c++) {
            const key = `${r}:${c}`;
            if (hiddenCells.has(key)) continue;

            const cell = row.getCell(c);
            const style = getCellStyle(cell);
            const value = getCellValue(cell);
            const merge = mergeMap.get(key);

            let attrs = style;
            if (merge) {
                if (merge.colspan > 1) attrs += ` colspan="${merge.colspan}"`;
                if (merge.rowspan > 1) attrs += ` rowspan="${merge.rowspan}"`;
            }

            cells.push(`<td${attrs}>${value}</td>`);
        }

        const rowHeight = row.height ? `style="height:${row.height}px"` : "";
        rows.push(`<tr ${rowHeight}>${cells.join("")}</tr>`);
    }

    return `<table>${colWidths.join("")}${rows.join("")}</table>`;
}

async function xlsxToHtml(buffer: Buffer, title: string, driveFileId?: string): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const sheets = workbook.worksheets.filter((s) => s.rowCount > 0);
    if (sheets.length === 0) return `<!DOCTYPE html><html><body><p>Empty spreadsheet</p></body></html>`;

    const hasMultipleSheets = sheets.length > 1;

    // Radio inputs (hidden, placed before panels for CSS ~ selector)
    const radioInputs = hasMultipleSheets
        ? sheets.map((_, i) =>
            `<input type="radio" name="sheet-tab" id="tab-${i}" class="tab-radio"${i === 0 ? " checked" : ""}>`
        ).join("")
        : "";

    // Check which sheets have formula errors and need CSV fallback
    const sheetsWithErrors = new Set<number>();
    for (let i = 0; i < sheets.length; i++) {
        if (sheetHasErrors(sheets[i])) sheetsWithErrors.add(i);
    }

    // Fetch computed values for sheets with errors via Sheets API
    const valuesFallbacks = new Map<number, string[][]>();
    if (driveFileId && sheetsWithErrors.size > 0) {
        for (const idx of sheetsWithErrors) {
            try {
                const values = await getSheetValues(driveFileId, sheets[idx].name);
                valuesFallbacks.set(idx, values);
            } catch {
                // If Sheets API fetch fails, render XLSX data with errors hidden
            }
        }
    }

    // Render each sheet panel (use Sheets API values for sheets with errors)
    const sheetPanels = sheets.map((sheet, i) => {
        const values = valuesFallbacks.get(i);
        const content = values ? renderValuesSheet(values) : renderSheet(sheet);
        return `<div class="sheet-panel" data-idx="${i}">${content}</div>`;
    }).join("");

    // Tab bar labels
    const tabBar = hasMultipleSheets
        ? `<div class="tab-bar">${sheets.map((sheet, i) =>
            `<label for="tab-${i}" class="tab">${escapeHtml(sheet.name)}</label>`
        ).join("")}</div>`
        : "";

    // Generate CSS rules per sheet for radio-based tab switching
    const sheetCssRules = hasMultipleSheets
        ? sheets.map((_, i) =>
            `#tab-${i}:checked ~ .sheets .sheet-panel[data-idx="${i}"] { display: block; }
  #tab-${i}:checked ~ .tab-bar label[for="tab-${i}"] { background: #fff; color: #1d2939; font-weight: 600; box-shadow: inset 0 2px 0 #2F5496; }`
        ).join("\n  ")
        : "";

    // Wrap panels in a container div for better layout control
    const sheetsWrapper = `<div class="sheets">${sheetPanels}</div>`;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; display: flex; flex-direction: column; height: 100vh; }
  .tab-radio { display: none; }
  .sheets { flex: 1; overflow: hidden; position: relative; }
  .sheet-panel { ${hasMultipleSheets ? "display: none;" : ""} position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: auto; }
  table { border-collapse: collapse; font-size: 13px; }
  td { padding: 6px 12px; border: 1px solid #e4e7ec; color: #344054; vertical-align: middle; white-space: nowrap; }
  td:empty { border-color: #f0f0f0; }
  .tab-bar { display: flex; gap: 0; border-top: 1px solid #e4e7ec; background: #f8f9fb; flex-shrink: 0; overflow-x: auto; position: relative; z-index: 10; }
  .tab { padding: 8px 20px; font-size: 12px; font-weight: 500; color: #667085; background: transparent; border: none; border-right: 1px solid #e4e7ec; cursor: pointer; white-space: nowrap; display: block; }
  .tab:hover { background: #f0f2f5; color: #344054; }
  ${sheetCssRules}
</style>
</head>
<body>${radioInputs}${sheetsWrapper}${tabBar}</body>
</html>`;
}

function parseCsvRow(row: string): string[] {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (inQuotes) {
            if (char === '"' && row[i + 1] === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                current += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === ",") {
            cells.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    cells.push(current);
    return cells;
}

function csvToHtmlTable(csv: string, title: string): string {
    const lines = csv.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) return "<!DOCTYPE html><html><body><p>Empty spreadsheet</p></body></html>";

    const allRows = lines.map((line) => {
        const cells = parseCsvRow(line);
        return `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`;
    }).join("");

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; }
  table { border-collapse: collapse; font-size: 13px; }
  td { padding: 6px 12px; border: 1px solid #e4e7ec; color: #344054; vertical-align: middle; white-space: nowrap; }
  tr:first-child td { background: #f8f9fb; font-weight: 600; color: #1d2939; }
</style>
</head>
<body><table>${allRows}</table></body>
</html>`;
}
