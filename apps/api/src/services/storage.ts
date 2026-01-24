import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "https://s3.eu-north-1.amazonaws.com";
const S3_REGION = process.env.AWS_REGION || "eu-north-1";
const S3_BUCKET = process.env.S3_BUCKET_NAME || "voice-notes-shlok-2026";

// Log configuration (masked) to help user find missing env vars in Render logs
console.log(`[Storage Config] Bucket: ${S3_BUCKET}, Region: ${S3_REGION}, Endpoint: ${S3_ENDPOINT}`);

const isAWS = S3_ENDPOINT.includes("amazonaws.com");

const s3Client = new S3Client({
    region: S3_REGION,
    endpoint: isAWS ? undefined : S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
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
