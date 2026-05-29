export interface TextChunk {
    content: string;
    chunkIndex: number;
    pageNumber?: number;
}

const CHUNK_SIZE = 1000; // characters
const CHUNK_OVERLAP = 200;

/**
 * Split text into overlapping chunks for embedding.
 */
export function chunkText(text: string): TextChunk[] {
    const chunks: TextChunk[] = [];

    // Clean whitespace
    const cleaned = text.replace(/\s+/g, " ").trim();

    if (cleaned.length <= CHUNK_SIZE) {
        return [{ content: cleaned, chunkIndex: 0 }];
    }

    let start = 0;
    let index = 0;

    while (start < cleaned.length) {
        let end = start + CHUNK_SIZE;

        // Try to break at a sentence boundary
        if (end < cleaned.length) {
            const lastPeriod = cleaned.lastIndexOf(". ", end);
            const lastNewline = cleaned.lastIndexOf("\n", end);
            const breakPoint = Math.max(lastPeriod, lastNewline);

            if (breakPoint > start + CHUNK_SIZE * 0.5) {
                end = breakPoint + 1;
            }
        }

        const content = cleaned.slice(start, Math.min(end, cleaned.length)).trim();

        if (content.length > 50) {
            chunks.push({ content, chunkIndex: index });
            index++;
        }

        start = end - CHUNK_OVERLAP;
        if (start >= cleaned.length) break;
    }

    return chunks;
}
