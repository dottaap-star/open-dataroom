import { getFileContent } from "../drive";
import { extractText as unpdfExtract, getDocumentProxy } from "unpdf";
import ExcelJS from "exceljs";

/**
 * Extract text from a document via Google Drive.
 * PDFs are parsed using unpdf. XLSX via exceljs. Other text formats read directly.
 * Google Workspace files are exported first (Sheets → XLSX, Docs/Slides → PDF).
 */
export async function extractText(driveFileId: string, originalMimeType: string): Promise<string> {
    const { buffer, contentType } = await getFileContent(driveFileId, originalMimeType);

    if (contentType === "application/pdf") {
        try {
            const pdf = await getDocumentProxy(new Uint8Array(buffer));
            const { text } = await unpdfExtract(pdf, { mergePages: true });
            return text;
        } catch (err) {
            console.error("PDF extraction failed, falling back to raw text:", err);
            return buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
        }
    }

    if (contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
            const lines: string[] = [];
            for (const sheet of workbook.worksheets) {
                sheet.eachRow((row) => {
                    const vals = row.values as (string | number | null)[];
                    lines.push(vals.slice(1).map((v) => String(v ?? "")).join("\t"));
                });
            }
            return lines.join("\n");
        } catch (err) {
            console.error("XLSX extraction failed:", err);
            return "";
        }
    }

    return buffer.toString("utf-8");
}
