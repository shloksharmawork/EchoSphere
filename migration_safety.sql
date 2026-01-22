-- Migration Phase 2: Safety & Moderation

-- 1. Update voice_pins with is_hidden
ALTER TABLE "voice_pins" ADD COLUMN IF NOT EXISTS "is_hidden" boolean DEFAULT false;

-- 2. Create blocks table
CREATE TABLE IF NOT EXISTS "blocks" (
    "id" serial PRIMARY KEY NOT NULL,
    "blocker_id" text NOT NULL,
    "blocked_id" text NOT NULL,
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "unique_block_idx" ON "blocks" ("blocker_id", "blocked_id");

-- 3. Create reports table
CREATE TABLE IF NOT EXISTS "reports" (
    "id" serial PRIMARY KEY NOT NULL,
    "reporter_id" text NOT NULL,
    "target_type" text NOT NULL,
    "target_id" text NOT NULL,
    "reason" text NOT NULL,
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE
);
