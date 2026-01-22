import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres"; // bun install postgres
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgres://echo_user:echo_password@localhost:5432/echosphere";

// Disable prefetch as it isn't supported for "Transaction" pool mode types which might be used later
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
