import { Hono } from "hono";
import { generateId } from "lucia";
import { Argon2id } from "oslo/password";
import { db } from "../db";
import { users, phoneVerifications } from "../db/schema";
import { lucia } from "../auth";
import { getCookie } from "hono/cookie";
import { eq, sql } from "drizzle-orm";



const authRouter = new Hono();

// Send OTP
authRouter.post("/otp/send", async (c) => {
    try {
        const { phone } = await c.req.json();
        if (!phone) return c.json({ error: "Phone number required" }, 400);

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await db.insert(phoneVerifications).values({
            phone,
            code,
            expiresAt
        }).catch(err => {
            console.error("[DB ERROR] Failed to insert OTP:", err);
            throw new Error(`Database error: ${err.message || "Unknown database error"}`);
        });

        // MSG91 Integration
        const authKey = process.env.MSG91_AUTH_KEY;
        const templateId = process.env.MSG91_TEMPLATE_ID;

        if (authKey && templateId) {
            try {
                // MSG91 expects mobile number with country code without '+' (e.g., 91769303XXXX)
                const mobile = phone.startsWith('+') ? phone.substring(1) : phone;

                // MSG91 OTP API (V5)
                // https://control.msg91.com/api/v5/otp?template_id=TEMPLATE_ID&mobile=MOBILE&authkey=AUTH_KEY&otp=OTP
                const response = await fetch(`https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${mobile}&authkey=${authKey}&otp=${code}`, {
                    method: 'POST'
                });

                const data: any = await response.json();

                if (data.type === 'success') {
                    console.log(`[MSG91] OTP sent to ${phone}`);
                } else {
                    console.error("[MSG91 ERROR]", data);
                    // Return specific error for easier debugging
                    return c.json({ error: `SMS Failed: ${data.message || "Unknown MSG91 Error"}` }, 500);
                }
            } catch (error: any) {
                console.error("[MSG91 FETCH ERROR]", error);
                return c.json({ error: `SMS Failed: ${error.message || "Network Error"}` }, 500);
            }
        } else {
            console.log(`[MOCK SMS] OTP for ${phone}: ${code}`);
            console.warn("[WARN] MSG91 credentials missing, using mock SMS.");
        }

        return c.json({ success: true, message: "OTP sent" });
    } catch (error: any) {
        console.error("[OTP SEND ERROR]", error);
        return c.json({ error: error.message || "Failed to send OTP" }, 500);
    }
});

// Verify OTP
authRouter.post("/otp/verify", async (c) => {
    const { phone, code } = await c.req.json();
    if (!phone || !code) return c.json({ error: "Phone and code required" }, 400);

    const verification = await db.select()
        .from(phoneVerifications)
        .where(eq(phoneVerifications.phone, phone))
        .orderBy(sql`${phoneVerifications.createdAt} DESC`)
        .limit(1);

    if (verification.length === 0 || verification[0].code !== code || verification[0].expiresAt < new Date()) {
        return c.json({ error: "Invalid or expired code" }, 400);
    }

    return c.json({ success: true });
});

authRouter.post("/signup", async (c) => {
    const { username, password, email, phone, countryCode, avatarUrl } = await c.req.json();

    if (!username || !password || !phone) {
        return c.json({ error: "Missing required fields" }, 400);
    }

    const hashedPassword = await new Argon2id().hash(password);
    const userId = generateId(15);

    try {
        await db.insert(users).values({
            id: userId,
            username,
            email,
            phone,
            countryCode, // Store country code
            avatarUrl,
            hashedPassword,
            isPhoneVerified: true // Assuming they verified OTP before calling signup
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
