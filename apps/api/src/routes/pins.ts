import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from '@hono/zod-validator'
import { db } from "../db";
import { voicePins } from "../db/schema";
import { generateUploadUrl } from "../services/storage";
import { wss } from "../websocket";
import { sql } from "drizzle-orm";
import type { User, Session } from 'lucia';

type Variables = {
    user: User | null;
    session: Session | null;
}

const app = new Hono<{ Variables: Variables }>();


// Schema for requesting an upload URL
const startUploadSchema = z.object({
    contentType: z.string().regex(/^audio\/(webm|mp4|mpeg|wav|ogg)$/),
    fileSize: z.number().max(10 * 1024 * 1024), // Max 10MB
});

// Schema for finalizing the Pin creation
const createPinSchema = z.object({
    title: z.string().optional(),
    audioUrl: z.string().url(),
    latitude: z.number(),
    longitude: z.number(),
    duration: z.number().optional(), // Audio duration in seconds
    isAnonymous: z.boolean().default(false),
    voiceMaskingEnabled: z.boolean().default(false),
});

const getPinsSchema = z.object({
    lat: z.coerce.number(),
    lng: z.coerce.number(),
    radius: z.coerce.number().default(5000), // meters
});

// 1. Get Presigned URL for Upload
app.post("/upload-url", zValidator('json', startUploadSchema), async (c) => {
    const { contentType } = c.req.valid('json');
    const fileKey = `pins/${Date.now()}-${crypto.randomUUID()}`;

    const data = await generateUploadUrl(fileKey, contentType);
    return c.json({
        uploadUrl: data.url,
        url: data.publicUrl,
        key: data.key
    });
});

// 2. Create Voice Pin (Requires Authentication)
app.post("/pins", zValidator('json', createPinSchema), async (c) => {
    const user = c.get('user');

    // Require authentication
    if (!user) {
        return c.json({ error: "Authentication required" }, 401);
    }

    const body = c.req.valid('json');

    // Fuzzy location logic: Jitter +/- ~200m for privacy
    const jitterLat = body.latitude + (Math.random() - 0.5) * 0.004;
    const jitterLng = body.longitude + (Math.random() - 0.5) * 0.004;

    const [newPin] = await db.insert(voicePins).values({
        creatorId: user.id, // Associate with authenticated user
        audioUrl: body.audioUrl,
        title: body.title,
        isAnonymousPost: body.isAnonymous,
        voiceMaskingEnabled: body.voiceMaskingEnabled,
        geom: sql`ST_SetSRID(ST_MakePoint(${body.longitude}, ${body.latitude}), 4326)`,
        fuzzyGeom: sql`ST_SetSRID(ST_MakePoint(${jitterLng}, ${jitterLat}), 4326)`,
    }).returning();

    // Broadcast new pin to connected clients via WebSocket
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // OPEN
            client.send(JSON.stringify({ type: 'new_pin', pin: newPin }));
        }
    });

    return c.json({ success: true, pin: newPin });
});

// 3. Get Nearby Pins (Discovery)
app.get("/pins", zValidator('query', getPinsSchema), async (c) => {
    const { lat, lng, radius } = c.req.valid('query');

    // Use PostGIS ST_DWithin on the fuzzy_geom (or real geom if we trust the user context)
    // For DISCOVERY, we return the fuzzy location to the frontend.
    // Note: We cast geometry to GeoJSON for easy consumption

    const nearbyPins = await db.execute(sql`
    SELECT 
      id, 
      audio_url as "audioUrl",
      title,
      is_anonymous_post as "isAnonymous",
      voice_masking_enabled as "voiceMaskingEnabled",
      created_at as "createdAt",
      ST_AsGeoJSON(fuzzy_geom)::json as location
    FROM ${voicePins}
    WHERE ST_DWithin(
      fuzzy_geom,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      ${radius}
    )
    ORDER BY created_at DESC
    LIMIT 50
  `);

    return c.json({ pins: nearbyPins });
});

export default app;
