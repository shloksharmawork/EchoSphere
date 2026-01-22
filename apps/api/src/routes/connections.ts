import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import { connectionRequests, users, blocks } from "../db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import type { User, Session } from "lucia";
import { notifyUser } from "../websocket";

type Variables = {
    user: User | null;
    session: Session | null;
};

const app = new Hono<{ Variables: Variables }>();

// Schemas
const connectionRequestSchema = z.object({
    receiverId: z.string(),
    audioIntroUrl: z.string().optional(),
});

// 1. Send Connection Request
app.post("/requests", zValidator("json", connectionRequestSchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { receiverId, audioIntroUrl } = c.req.valid("json");
    const senderId = user.id;

    if (senderId === receiverId) {
        return c.json({ error: "You cannot connect with yourself" }, 400);
    }

    // 0. Rate limiting: Max 5 pending requests sent in the last hour
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    const recentRequests = await db
        .select()
        .from(connectionRequests)
        .where(
            and(
                eq(connectionRequests.senderId, senderId),
                sql`${connectionRequests.createdAt} > ${oneHourAgo}`
            )
        );

    if (recentRequests.length >= 5) {
        return c.json(
            { error: "Too many requests. Please wait a while before sending more." },
            429
        );
    }

    // Check if either user has blocked the other
    const [isBlocked] = await db
        .select()
        .from(blocks)
        .where(
            or(
                and(eq(blocks.blockerId, senderId), eq(blocks.blockedId, receiverId)),
                and(eq(blocks.blockerId, receiverId), eq(blocks.blockedId, senderId))
            )
        );

    if (isBlocked) {
        return c.json({ error: "Cannot send request to this user" }, 403);
    }

    // Check if already connected or pending
    const existing = await db
        .select()
        .from(connectionRequests)
        .where(
            or(
                and(
                    eq(connectionRequests.senderId, senderId),
                    eq(connectionRequests.receiverId, receiverId)
                ),
                and(
                    eq(connectionRequests.senderId, receiverId),
                    eq(connectionRequests.receiverId, senderId)
                )
            )
        );

    if (existing.length > 0) {
        return c.json({ error: "Connection already exists or pending" }, 400);
    }

    const [request] = await db
        .insert(connectionRequests)
        .values({
            senderId,
            receiverId,
            status: "PENDING",
            audioIntroUrl,
        })
        .returning();

    // NOTIFY RECEIVER IN REAL-TIME
    notifyUser(receiverId, "NOTIFICATION", {
        type: "CONNECTION_REQUEST",
        sender: {
            id: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl
        },
        requestId: request.id
    });

    return c.json({ success: true, request });
});

// 2. Get incoming requests
app.get("/requests", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const requests = await db
        .select({
            id: connectionRequests.id,
            status: connectionRequests.status,
            audioIntroUrl: connectionRequests.audioIntroUrl,
            createdAt: connectionRequests.createdAt,
            sender: {
                id: users.id,
                username: users.username,
                avatarUrl: users.avatarUrl,
                reputationScore: users.reputationScore
            }
        })
        .from(connectionRequests)
        .leftJoin(users, eq(connectionRequests.senderId, users.id))
        .where(
            and(
                eq(connectionRequests.receiverId, user.id),
                eq(connectionRequests.status, "PENDING")
            )
        );

    return c.json({ requests });
});

// 3. Accept/Reject/Block Request
app.post("/requests/:id/:action", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const id = parseInt(c.req.param("id"));
    const action = c.req.param("action"); // accept, ignore, block

    if (!["accept", "ignore", "block"].includes(action)) {
        return c.json({ error: "Invalid action" }, 400);
    }

    // Verify the request exists and the user is the receiver
    const [request] = await db
        .select()
        .from(connectionRequests)
        .where(eq(connectionRequests.id, id));

    if (!request || request.receiverId !== user.id) {
        return c.json({ error: "Request not found or unauthorized" }, 404);
    }

    let status: "ACCEPTED" | "IGNORED" | "BLOCKED" = "ACCEPTED";
    if (action === "ignore") status = "IGNORED";
    if (action === "block") {
        status = "BLOCKED";
        // Also add to the blocks table for consistency
        await db.insert(blocks).values({
            blockerId: user.id,
            blockedId: request.senderId,
        });
    }

    const [updated] = await db
        .update(connectionRequests)
        .set({ status })
        .where(eq(connectionRequests.id, id))
        .returning();

    // Notify the sender if accepted
    if (status === "ACCEPTED") {
        // Increment reputation for both
        await db.update(users)
            .set({ reputationScore: sql`${users.reputationScore} + 10` })
            .where(or(eq(users.id, user.id), eq(users.id, request.senderId)));

        notifyUser(request.senderId, "NOTIFICATION", {
            type: "CONNECTION_ACCEPTED",
            userId: user.id,
            username: user.username
        });
    }

    return c.json({ success: true, status: updated.status });
});

export default app;
