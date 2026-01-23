import { db } from "../db";
import { voicePins, phoneVerifications } from "../db/schema";
import { sql, lt } from "drizzle-orm";

/**
 * Cleanup service to remove expired voice pins and phone verifications.
 * Runs every hour.
 */
export function startCleanupService() {
    console.log("Starting EchoSphere Cleanup Service...");

    setInterval(async () => {
        try {
            const now = new Date();

            // 1. Delete expired Voice Pins
            const deletedPins = await db.delete(voicePins)
                .where(lt(voicePins.expiresAt, now));

            // 2. Delete expired Phone Verifications
            const deletedOTP = await db.delete(phoneVerifications)
                .where(lt(phoneVerifications.expiresAt, now));

            if (deletedPins.count > 0 || deletedOTP.count > 0) {
                console.log(`[CLEANUP] Deleted ${deletedPins.count} expired pins and ${deletedOTP.count} expired OTPs.`);
            }
        } catch (error) {
            console.error("[CLEANUP ERROR]:", error);
        }
    }, 60 * 60 * 1000); // Every 1 hour
}
