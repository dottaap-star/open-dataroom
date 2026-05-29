import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

const BUCKET = process.env.S3_BUCKET_NAME || "";
const PREFIX = "investors/docs";

/**
 * Upload a document to S3.
 */
export async function uploadDocument(
    category: string,
    filename: string,
    buffer: Buffer,
    contentType: string
): Promise<string> {
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${PREFIX}/${category}/${safeFilename}`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            ContentDisposition: "inline", // View in browser, not download
        })
    );

    return key;
}

/**
 * Generate a pre-signed URL for viewing a document (time-limited).
 * Default: 1 hour expiry.
 */
export async function getPresignedViewUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ResponseContentDisposition: "inline",
    });

    return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a document from S3.
 */
export async function deleteDocument(key: string): Promise<void> {
    await s3Client.send(
        new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: key,
        })
    );
}
