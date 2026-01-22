import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from '@hono/zod-validator'
import { db } from "../db";
import { connectionRequests, users } from "../db/schema";
import { eq, and, or } from "drizzle-orm";

const app = new Hono();

// Schemas
const connectionRequestSchema = z.object({
    receiverId: z.number(),
    audioIntroUrl: z.string().optional(),
});

const reportSchema = z.object({
    targetUserId: z.number().optional(),
    targetPinId: z.number().optional(),
    reason: z.string(),
});

// 1. Send Connection Request
app.post("/requests", zValidator('json', connectionRequestSchema), async (c) => {
    const { receiverId, audioIntroUrl } = c.req.valid('json');
    // In a real app, get senderId from Auth context
    const senderId = 1; // Mock Sender ID

    // Check if blocked or already connected
    const existing = await db.select().from(connectionRequests).where(
        or(
            and(eq(connectionRequests.senderId, senderId), eq(connectionRequests.receiverId, receiverId)),
            and(eq(connectionRequests.senderId, receiverId), eq(connectionRequests.receiverId, senderId))
        )
    );

    if (existing.length > 0) {
        return c.json({ error: "Connection already exists or pending" }, 400);
    }

    const [request] = await db.insert(connectionRequests).values({
        senderId,
        receiverId,
        status: "PENDING",
        audioIntroUrl
    }).returning();

    return c.json({ success: true, request });
});

// 2. Accept/Reject/Block Request
app.post("/requests/:id/:action", async (c) => {
    const id = parseInt(c.req.param("id"));
    const action = c.req.param("action"); // accept, ignore, block

    if (!['accept', 'ignore', 'block'].includes(action)) {
        return c.json({ error: "Invalid action" }, 400);
    }

    let status: "ACCEPTED" | "IGNORED" | "BLOCKED" = "ACCEPTED";
    if (action === 'ignore') status = "IGNORED";
    if (action === 'block') status = "BLOCKED";

    const [updated] = await db.update(connectionRequests)
        .set({ status })
        .where(eq(connectionRequests.id, id))
        .returning();

    return c.json({ success: true, status: updated.status });
});

// 3. Report User/Content
app.post("/report", zValidator('json', reportSchema), async (c) => {
    // Just log it for now, or save to a reports table
    console.log("[REPORT RECEIVED]", c.req.valid('json'));
    return c.json({ success: true, message: "Report submitted" });
});

export default app;
