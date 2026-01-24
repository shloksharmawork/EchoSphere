import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from '@hono/zod-validator'
import { db } from "../db";
import { voicePins, blocks, reports } from "../db/schema";
import { wss } from "../websocket";
import { sql, and, eq, notInArray, exists } from "drizzle-orm";
import type { User, Session } from 'lucia';

type Variables = {
  user: User | null;
  session: Session | null;
}

const app = new Hono<{ Variables: Variables }>();

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

  console.log(`[POST /pins] Creating pin for user ${user.id} at ${body.latitude}, ${body.longitude}`);

  try {
    const [newPin] = await db.insert(voicePins).values({
      creatorId: user.id, // Associate with authenticated user
      audioUrl: body.audioUrl,
      title: body.title,
      isAnonymousPost: body.isAnonymous,
      voiceMaskingEnabled: body.voiceMaskingEnabled,
      geom: sql`ST_SetSRID(ST_MakePoint(${body.longitude}, ${body.latitude}), 4326)`,
      fuzzyGeom: sql`ST_SetSRID(ST_MakePoint(${jitterLng}, ${jitterLat}), 4326)`,
      expiresAt: new Date(Date.now() + 15 * 60 * 60 * 1000), // Expire in 15 hours
    }).returning();

    // Format pin for broadcast/response (matches GET /pins structure)
    const formattedPin = {
      id: newPin.id,
      audioUrl: newPin.audioUrl,
      title: newPin.title,
      isAnonymous: newPin.isAnonymousPost,
      voiceMaskingEnabled: newPin.voiceMaskingEnabled,
      createdAt: newPin.createdAt,
      creatorId: newPin.creatorId,
      location: {
        type: 'Point',
        coordinates: [body.longitude, body.latitude] // Use the exact drop coordinates (not jittered for the creator/broadcast)
      }
    };

    // Broadcast new pin to connected clients via WebSocket
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN
        client.send(JSON.stringify({ type: 'new_pin', pin: formattedPin }));
      }
    });

    return c.json({ success: true, pin: formattedPin });
  } catch (err: any) {
    console.error(`[POST /pins] Database error: ${err.message}`);
    return c.json({ error: "Failed to create pin in database", message: err.message }, 500);
  }
});

// 3. Get Nearby Pins (Discovery)
app.get("/pins", zValidator('query', getPinsSchema), async (c) => {
  const { lat, lng, radius } = c.req.valid('query');

  // Use PostGIS ST_DWithin on the fuzzy_geom (or real geom if we trust the user context)
  // For DISCOVERY, we return the fuzzy location to the frontend.
  // Note: We cast geometry to GeoJSON for easy consumption

  // Discovery: Filter out hidden pins and blocked users
  const user = c.get('user');

  const nearbyPins = await db.execute(sql`
    SELECT 
      p.id, 
      p.audio_url as "audioUrl",
      p.title,
      p.is_anonymous_post as "isAnonymous",
      p.voice_masking_enabled as "voiceMaskingEnabled",
      p.created_at as "createdAt",
      p.creator_id as "creatorId",
      ST_AsGeoJSON(p.fuzzy_geom)::json as location
    FROM ${voicePins} p
    WHERE p.is_hidden = false
    AND ST_DWithin(
      p.fuzzy_geom,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      ${radius}
    )
    -- Hide pins with 20 or more reports (Auto-flagging)
    AND (
      SELECT COUNT(*) FROM ${reports} r 
      WHERE r.target_type = 'PIN' AND r.target_id = p.id::text
    ) < 20
    ${user
      ? sql`
      AND NOT EXISTS (
        SELECT 1 FROM ${blocks} b 
        WHERE (b.blocker_id = ${user.id} AND b.blocked_id = p.creator_id)
        OR (b.blocker_id = p.creator_id AND b.blocked_id = ${user.id})
      )
    `
      : sql``
    }
    ORDER BY p.created_at DESC
    LIMIT 50
  `);

  return c.json({ pins: nearbyPins });
});

export default app;
