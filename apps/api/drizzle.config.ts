import type { Config } from "drizzle-kit";

export default {
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    driver: "pg",
    dbCredentials: {
        connectionString: process.env.DATABASE_URL || "postgres://echo_user:echo_password@localhost:5432/echosphere",
    },
} satisfies Config;
