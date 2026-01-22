import { Hono } from "hono";
import { generateId } from "lucia";
import { Argon2id } from "oslo/password";
import { db } from "../db";
import { users } from "../db/schema";
import { lucia } from "../auth";
import { getCookie } from "hono/cookie";
import { eq } from "drizzle-orm";

const authRouter = new Hono();

authRouter.post("/signup", async (c) => {
    const { username, password } = await c.req.json();

    if (!username || !password) {
        return c.json({ error: "Invalid input" }, 400);
    }

    const hashedPassword = await new Argon2id().hash(password);
    const userId = generateId(15);

    try {
        await db.insert(users).values({
            id: userId,
            username,
            hashedPassword
        });

        const session = await lucia.createSession(userId, {});
        const sessionCookie = lucia.createSessionCookie(session.id);

        c.header("Set-Cookie", sessionCookie.serialize(), { append: true });

        return c.json({ success: true, user: { id: userId, username } });
    } catch (e) {
        console.error(e);
        // Postgres error code 23505 is unique_violation
        // Note: checking generic error here for simplicity
        return c.json({ error: "Username already taken or unknown error" }, 400);
    }
});

authRouter.post("/login", async (c) => {
    const { username, password } = await c.req.json();

    if (!username || !password) {
        return c.json({ error: "Invalid input" }, 400);
    }

    const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (existingUser.length === 0) {
        return c.json({ error: "Incorrect username or password" }, 400);
    }

    const user = existingUser[0];

    if (!user.hashedPassword) {
        return c.json({ error: "Invalid account state" }, 400);
    }

    const validPassword = await new Argon2id().verify(user.hashedPassword, password);

    if (!validPassword) {
        return c.json({ error: "Incorrect username or password" }, 400);
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    c.header("Set-Cookie", sessionCookie.serialize(), { append: true });

    return c.json({ success: true, user: { id: user.id, username: user.username } });
});

authRouter.post("/logout", async (c) => {
    const sessionId = lucia.readSessionCookie(c.req.header("Cookie") ?? "");

    if (!sessionId) {
        return c.json({ error: "No session" }, 401);
    }

    await lucia.invalidateSession(sessionId);

    const sessionCookie = lucia.createBlankSessionCookie();
    c.header("Set-Cookie", sessionCookie.serialize(), { append: true });

    return c.json({ success: true });
});

authRouter.get("/me", async (c) => {
    // Session validation usually happens in middleware, but checking here explicitly for clarity
    // or if middleware didn't set context yet (though we plan to add middleware)

    const sessionId = lucia.readSessionCookie(c.req.header("Cookie") ?? "");
    if (!sessionId) {
        return c.json({ user: null });
    }

    const { session, user } = await lucia.validateSession(sessionId);

    if (!session) {
        const sessionCookie = lucia.createBlankSessionCookie();
        c.header("Set-Cookie", sessionCookie.serialize(), { append: true });
        return c.json({ user: null });
    }

    // Refresh cookie if needed
    if (session && session.fresh) {
        const sessionCookie = lucia.createSessionCookie(session.id);
        c.header("Set-Cookie", sessionCookie.serialize(), { append: true });
    }

    return c.json({ user });
});

import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const profileSchema = z.object({
    username: z.string().min(3).optional(),
    avatarUrl: z.string().url().optional(),
    isAnonymous: z.boolean().optional(),
});

authRouter.patch("/profile", zValidator("json", profileSchema), async (c) => {
    const sessionId = lucia.readSessionCookie(c.req.header("Cookie") ?? "");
    if (!sessionId) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const { username, avatarUrl, isAnonymous } = c.req.valid("json");

    try {
        const updateData: any = {};
        if (username) updateData.username = username;
        if (avatarUrl) updateData.avatarUrl = avatarUrl;
        if (typeof isAnonymous !== 'undefined') updateData.isAnonymous = isAnonymous;

        if (Object.keys(updateData).length === 0) {
            return c.json({ error: "No data to update" }, 400);
        }

        await db.update(users)
            .set(updateData)
            .where(eq(users.id, user.id));

        return c.json({ success: true, message: "Profile updated" });
    } catch (e) {
        console.error(e);
        return c.json({ error: "Failed to update profile" }, 500);
    }
});

export default authRouter;
