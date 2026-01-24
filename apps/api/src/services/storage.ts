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
    // only provide endpoint if it's NOT standard AWS S3 (e.g. MinIO)
    endpoint: isAWS ? undefined : S3_ENDPOINT,
    credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
    },
    // path-style is for MinIO/Local, virtual-host is for AWS
    forcePathStyle: !isAWS,
});

export const generateUploadUrl = async (key: string, contentType: string) => {
    // 1. Check if Mock Storage should be used
    const isMock = !process.env.AWS_ACCESS_KEY_ID ||
        !process.env.AWS_SECRET_ACCESS_KEY ||
        process.env.AWS_ACCESS_KEY_ID === "minio_admin" ||
        S3_ENDPOINT.includes("localhost");

    if (isMock) {
        console.warn("[Storage] Using Mock Fallback");
        return {
            url: "https://echo-sphere-mock-storage.vercel.app/unused",
            key,
            bucket: "mock-bucket",
            publicUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            isMock: true
        };
    }

    console.log(`[Storage] Generating Signed URL. Region: ${S3_REGION}, Bucket: ${S3_BUCKET}, Key: ${key}, isAWS: ${isAWS}`);

    // 2. Create the command. 
    // IMPORTANT: We remove ContentType from the Command to ensure the signer doesn't 
    // include it in the signed headers, making the request from the browser more flexible.
    const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
    });

    // 3. Generate Signed URL
    const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // 4. Calculate Public URL
    const publicUrl = isAWS
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
