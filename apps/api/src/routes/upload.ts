import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from '@hono/zod-validator'
import { generateUploadUrl } from "../services/storage";

const app = new Hono();

// Schema for requesting an upload URL
// Allow images (for profile) and audio (for pins)
const startUploadSchema = z.object({
    contentType: z.string().regex(/^(audio\/(webm|mp4|mpeg|wav|ogg)|image\/(jpeg|png|webp|gif))(;.*)?$/),
    fileSize: z.number().max(10 * 1024 * 1024), // Max 10MB
});

app.post("/upload-url", zValidator('json', startUploadSchema), async (c) => {
    const { contentType, fileSize } = c.req.valid('json');
    console.log(`[POST /upload-url] Request for ${contentType} (${fileSize} bytes)`);

    try {
        // Determine folder based on content type
        const folder = contentType.startsWith('image/') ? 'avatars' : 'pins';
        const fileKey = `${folder}/${Date.now()}-${crypto.randomUUID()}`;

        const data = await generateUploadUrl(fileKey, contentType);
        console.log(`[POST /upload-url] Generated URL: ${data.isMock ? 'MOCK' : 'S3'}`);
        return c.json({
            uploadUrl: data.url,
            url: data.publicUrl,
            key: data.key,
            isMock: (data as any).isMock
        });
    } catch (err: any) {
        console.error(`[POST /upload-url] Error: ${err.message}`);
        return c.json({ error: "Storage error", message: err.message }, 500);
    }
});

export default app;
