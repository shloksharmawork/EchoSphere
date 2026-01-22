import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import { blocks, reports } from "../db/schema";
import { eq, and } from "drizzle-orm";
import type { User, Session } from "lucia";

type Variables = {
    user: User | null;
    session: Session | null;
};

const app = new Hono<{ Variables: Variables }>();

const blockSchema = z.object({
    blockedId: z.string(),
});

const reportSchema = z.object({
    targetType: z.enum(["PIN", "USER"]),
    targetId: z.string(),
    reason: z.string(),
});

// 1. Block a User
app.post("/block", zValidator("json", blockSchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { blockedId } = c.req.valid("json");

    if (user.id === blockedId) {
        return c.json({ error: "You cannot block yourself" }, 400);
    }

    // Check if already blocked
    const [existing] = await db
        .select()
        .from(blocks)
        .where(and(eq(blocks.blockerId, user.id), eq(blocks.blockedId, blockedId)));

    if (existing) {
        return c.json({ message: "User already blocked" });
    }

    await db.insert(blocks).values({
        blockerId: user.id,
        blockedId,
    });

    return c.json({ success: true, message: "User blocked" });
});

// 2. Unblock a User
app.delete("/block/:blockedId", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const blockedId = c.req.param("blockedId");

    await db
        .delete(blocks)
        .where(and(eq(blocks.blockerId, user.id), eq(blocks.blockedId, blockedId)));

    return c.json({ success: true, message: "User unblocked" });
});

// 3. Report Content
app.post("/report", zValidator("json", reportSchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { targetType, targetId, reason } = c.req.valid("json");

    await db.insert(reports).values({
        reporterId: user.id,
        targetType,
        targetId,
        reason,
    });

    return c.json({ success: true, message: "Report submitted" });
});

export default app;
