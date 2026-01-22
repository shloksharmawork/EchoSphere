import { pgTable, serial, text, boolean, integer, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";

// Custom Geometry Type for PostGIS
const geometry = customType<{ data: string }>({
    dataType() {
        return "geometry(Point, 4326)";
    },
});

export const users = pgTable("users", {
    id: text("id").primaryKey(), // Lucia uses text IDs
    username: text("username").unique(),
    email: text("email").unique(),
    hashedPassword: text("hashed_password"), // Added for auth
    isAnonymous: boolean("is_anonymous").default(false),
    reputationScore: integer("reputation_score").default(100),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id),
    expiresAt: timestamp("expires_at", {
        withTimezone: true,
        mode: "date"
    }).notNull()
});

export const voicePins = pgTable("voice_pins", {
    id: serial("id").primaryKey(),
    creatorId: text("creator_id").references(() => users.id), // Changed to text
    title: text("title"),
    audioUrl: text("audio_url").notNull(),

    // Privacy & Location
    geom: geometry("geom").notNull(), // Exact location (internal use)

    // We can calculate fuzzy location on the fly or store it. 
    // Keeping it for now if we want to index on it for broad privacy-safe searches.
    fuzzyGeom: geometry("fuzzy_geom"),

    locationName: text("location_name"),

    isAnonymousPost: boolean("is_anonymous_post").default(false),
    voiceMaskingEnabled: boolean("voice_masking_enabled").default(false),

    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
    return {
        spatialIndex: index("spatial_index").on(table.geom).using(sql`gist`),
        // fuzzySpatialIndex: index("fuzzy_spatial_index").on(table.fuzzyGeom).using(sql`gist`),
    };
});

// Gated Connection System
export const connectionRequests = pgTable("connection_requests", {
    id: serial("id").primaryKey(),
    senderId: text("sender_id").references(() => users.id).notNull(), // Changed to text
    receiverId: text("receiver_id").references(() => users.id).notNull(), // Changed to text
    status: text("status", { enum: ["PENDING", "ACCEPTED", "IGNORED", "BLOCKED"] }).default("PENDING"),
    audioIntroUrl: text("audio_intro_url"),
    createdAt: timestamp("created_at").defaultNow(),
});
