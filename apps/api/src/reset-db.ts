import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || "postgres://echo_user:echo_password@localhost:5432/echosphere";

async function main() {
    const sql = postgres(connectionString);
    console.log("Dropping all tables...");

    await sql`DROP SCHEMA public CASCADE;`;
    await sql`CREATE SCHEMA public;`;
    await sql`GRANT ALL ON SCHEMA public TO public;`;

    console.log("Enabling PostGIS...");
    await sql`CREATE EXTENSION IF NOT EXISTS postgis;`;

    console.log("Database reset complete.");
    await sql.end();
}

main().catch(console.error);
