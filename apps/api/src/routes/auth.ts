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

export default authRouter;
