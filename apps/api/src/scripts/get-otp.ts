import { db } from "../db";
import { phoneVerifications } from "../db/schema";
import { desc } from "drizzle-orm";

async function main() {
    try {
        const latest = await db.select().from(phoneVerifications).orderBy(desc(phoneVerifications.createdAt)).limit(1);
        if (latest.length > 0) {
            console.log(`LATEST_OTP:${latest[0].code}`);
        } else {
            console.log("LATEST_OTP:NONE");
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

main();
