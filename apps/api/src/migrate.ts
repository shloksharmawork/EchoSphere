import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || "postgres://echo_user:echo_password@localhost:5432/echosphere";

export async function runMigrations() {
    console.log("Migration started...");
    const migrationClient = postgres(connectionString, { max: 1 });
    const db = drizzle(migrationClient);

    await migrate(db, { migrationsFolder: "drizzle" });

    console.log("Migration completed");
    await migrationClient.end();
}

if (import.meta.url.endsWith(process.argv[1])) {
    runMigrations().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
