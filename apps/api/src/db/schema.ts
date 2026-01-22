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
    creatorId: text("creator_id").references(() => users.id),
    title: text("title"),
    audioUrl: text("audio_url").notNull(),

    // Privacy & Location
    geom: geometry("geom").notNull(),
    fuzzyGeom: geometry("fuzzy_geom"),

    locationName: text("location_name"),

    isAnonymousPost: boolean("is_anonymous_post").default(false),
    voiceMaskingEnabled: boolean("voice_masking_enabled").default(false),
    isHidden: boolean("is_hidden").default(false),

    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
    return {
        spatialIndex: index("spatial_index").on(table.geom).using(sql`gist`),
    };
});

// User Blocking System
export const blocks = pgTable("blocks", {
    id: serial("id").primaryKey(),
    blockerId: text("blocker_id").references(() => users.id).notNull(),
    blockedId: text("blocked_id").references(() => users.id).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
    return {
        uniqueBlock: index("unique_block_idx").on(table.blockerId, table.blockedId),
    };
});

// Content Reporting System
export const reports = pgTable("reports", {
    id: serial("id").primaryKey(),
    reporterId: text("reporter_id").references(() => users.id).notNull(),
    targetType: text("target_type", { enum: ["PIN", "USER"] }).notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});

// Gated Connection System
export const connectionRequests = pgTable("connection_requests", {
    id: serial("id").primaryKey(),
    senderId: text("sender_id").references(() => users.id).notNull(),
    receiverId: text("receiver_id").references(() => users.id).notNull(),
    status: text("status", { enum: ["PENDING", "ACCEPTED", "IGNORED", "BLOCKED"] }).default("PENDING"),
    audioIntroUrl: text("audio_intro_url"),
    createdAt: timestamp("created_at").defaultNow(),
});

