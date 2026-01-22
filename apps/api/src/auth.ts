import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "./db";
import { sessions, users } from "./db/schema";

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);



export const lucia = new Lucia(adapter, {
    sessionCookie: {
        attributes: {
            secure: process.env.NODE_ENV === "production"
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
