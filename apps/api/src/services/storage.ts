import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:9000";
const S3_REGION = process.env.AWS_REGION || "us-east-1";
const S3_BUCKET = process.env.S3_BUCKET_NAME || "voice-notes";
const S3_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID || "minio_admin";
const S3_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY || "minio_password";

// Force path style for MinIO
const s3Client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
    },
    forcePathStyle: true,
});

export const generateUploadUrl = async (key: string, contentType: string) => {
    // If S3 keys are missing OR set to local default, and we aren't explicitly 100% configured
    const isMock = !process.env.AWS_ACCESS_KEY_ID ||
        !process.env.AWS_SECRET_ACCESS_KEY ||
        process.env.AWS_ACCESS_KEY_ID === "minio_admin" ||
        S3_ENDPOINT.includes("localhost") ||
        S3_ENDPOINT.includes("127.0.0.1");

    if (isMock) {
        console.warn("\n" + "=".repeat(60));
        console.warn("[CRITICAL] S3 credentials missing or set to local. FALLING BACK TO MOCK STORAGE.");
        console.warn("If this is production, your voice drops will NOT record actual audio.");
        console.warn("Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_ENDPOINT, and S3_BUCKET_NAME.");
        console.warn("=".repeat(60) + "\n");
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
