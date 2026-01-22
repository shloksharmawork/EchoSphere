import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:9000";
const S3_REGION = process.env.S3_REGION || "us-east-1";
const S3_BUCKET = process.env.S3_BUCKET || "voice-notes";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "minio_admin";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "minio_password";

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
    const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        ContentType: contentType,
    });

    // URL expires in 5 minutes
    const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    return {
        url,
        key,
        bucket: S3_BUCKET,
        publicUrl: `${S3_ENDPOINT}/${S3_BUCKET}/${key}`, // Assuming public bucket
    };
};
