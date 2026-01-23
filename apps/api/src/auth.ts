import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "./db";
import { sessions, users } from "./db/schema";

const adapter = new DrizzlePostgreSQLAdapter(db, sessions as any, users as any);



export const lucia = new Lucia(adapter, {
    sessionCookie: {
        attributes: {
            secure: true, // Always true since Render/Vercel use HTTPS
            sameSite: "none" // Required for cross-domain login
        }
    },
    getUserAttributes: (attributes) => {
        return {
            username: attributes.username,
            avatarUrl: attributes.avatarUrl,
            reputationScore: attributes.reputationScore,
            isAnonymous: attributes.isAnonymous
        };
    }
});

declare module "lucia" {
    interface Register {
        Lucia: typeof lucia;
        DatabaseUserAttributes: DatabaseUserAttributes;
    }
}

interface DatabaseUserAttributes {
    username: string;
    avatarUrl: string | null;
    reputationScore: number;
    isAnonymous: boolean;
}
