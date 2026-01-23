import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from '@hono/zod-validator'
import { generateUploadUrl } from "../services/storage";

const app = new Hono();

// Schema for requesting an upload URL
// Allow images (for profile) and audio (for pins)
const startUploadSchema = z.object({
    contentType: z.string().regex(/^(audio\/(webm|mp4|mpeg|wav|ogg)|image\/(jpeg|png|webp|gif))$/),
    fileSize: z.number().max(10 * 1024 * 1024), // Max 10MB
});

app.post("/upload-url", zValidator('json', startUploadSchema), async (c) => {
    const { contentType } = c.req.valid('json');

    // Determine folder based on content type
    const folder = contentType.startsWith('image/') ? 'avatars' : 'pins';
    const fileKey = `${folder}/${Date.now()}-${crypto.randomUUID()}`;

    const data = await generateUploadUrl(fileKey, contentType);
    return c.json({
        uploadUrl: data.url,
        url: data.publicUrl,
        key: data.key
    });
});

export default app;
