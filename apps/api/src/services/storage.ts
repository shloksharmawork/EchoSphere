import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:9000";
const S3_REGION = process.env.AWS_REGION || "us-east-1";
const S3_BUCKET = process.env.S3_BUCKET_NAME || "voice-notes";
const S3_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID || "minio_admin";
const S3_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY || "minio_password";

// For standard AWS S3, we should NOT force path style. 
// For MinIO/Local, we MUST force path style.
const isAWS = S3_ENDPOINT.includes("amazonaws.com");

const s3Client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
    },
    forcePathStyle: !isAWS,
});

export const generateUploadUrl = async (key: string, contentType: string) => {
    // ... (rest of isMock logic) ...
    // [lines 22-42 in original file]

    const isMock = !process.env.AWS_ACCESS_KEY_ID ||
        !process.env.AWS_SECRET_ACCESS_KEY ||
        process.env.AWS_ACCESS_KEY_ID === "minio_admin" ||
        S3_ENDPOINT.includes("localhost") ||
        S3_ENDPOINT.includes("127.0.0.1");

    if (isMock) {
        // ... (existing mock return)
        return {
            url: "https://echo-sphere-mock-storage.vercel.app/unused",
            key,
            bucket: "mock-bucket",
            publicUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            isMock: true
        };
    }

    const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        ContentType: contentType,
        // Removed ChecksumAlgorithm entirely to prevent 400 Bad Request from mandatory checksum headers
    });

    // URL expires in 5 minutes
    const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // For real AWS S3, use virtual-host style URL: https://bucket.s3.region.amazonaws.com/key
    // For MinIO/Local dev, stick to path style or the provided endpoint
    const isStandardS3 = S3_ENDPOINT.includes("amazonaws.com");
    const publicUrl = isStandardS3
        ? `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`
        : `${S3_ENDPOINT}/${S3_BUCKET}/${key}`;

    return {
        url,
        key,
        bucket: S3_BUCKET,
        publicUrl,
        isMock: false
    };
};
