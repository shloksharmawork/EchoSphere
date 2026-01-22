-- Migration: Add Auth Tables and Update Schema for Lucia
-- This migration adds sessions table and updates users for authentication

-- Step 1: Create sessions table
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);

-- Step 2: Modify users table for auth
-- Drop old constraints and add new columns
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_username_unique";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_unique";

-- Add new auth columns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hashed_password" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "new_id" text;

-- Generate text IDs for existing users (if any)
UPDATE "users" SET "new_id" = 'user_' || "id"::text WHERE "new_id" IS NULL;

-- Drop old foreign keys
ALTER TABLE "voice_pins" DROP CONSTRAINT IF EXISTS "voice_pins_creator_id_users_id_fk";
ALTER TABLE "connection_requests" DROP CONSTRAINT IF EXISTS "connection_requests_sender_id_users_id_fk";
ALTER TABLE "connection_requests" DROP CONSTRAINT IF EXISTS "connection_requests_receiver_id_users_id_fk";

-- Update foreign key columns to text and migrate data
ALTER TABLE "voice_pins" ADD COLUMN IF NOT EXISTS "new_creator_id" text;
UPDATE "voice_pins" SET "new_creator_id" = 'user_' || "creator_id"::text WHERE "creator_id" IS NOT NULL;

ALTER TABLE "connection_requests" ADD COLUMN IF NOT EXISTS "new_sender_id" text;
ALTER TABLE "connection_requests" ADD COLUMN IF NOT EXISTS "new_receiver_id" text;
UPDATE "connection_requests" SET "new_sender_id" = 'user_' || "sender_id"::text;
UPDATE "connection_requests" SET "new_receiver_id" = 'user_' || "receiver_id"::text;

-- Drop old columns and rename new ones
ALTER TABLE "users" DROP COLUMN IF EXISTS "id";
ALTER TABLE "users" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "users" ADD PRIMARY KEY ("id");

ALTER TABLE "voice_pins" DROP COLUMN IF EXISTS "creator_id";
ALTER TABLE "voice_pins" RENAME COLUMN "new_creator_id" TO "creator_id";

ALTER TABLE "connection_requests" DROP COLUMN IF EXISTS "sender_id";
ALTER TABLE "connection_requests" DROP COLUMN IF EXISTS "receiver_id";
ALTER TABLE "connection_requests" RENAME COLUMN "new_sender_id" TO "sender_id";
ALTER TABLE "connection_requests" RENAME COLUMN "new_receiver_id" TO "receiver_id";
ALTER TABLE "connection_requests" ALTER COLUMN "sender_id" SET NOT NULL;
ALTER TABLE "connection_requests" ALTER COLUMN "receiver_id" SET NOT NULL;

-- Re-add constraints
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");

-- Add foreign keys
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "voice_pins" ADD CONSTRAINT "voice_pins_creator_id_users_id_fk" 
    FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_sender_id_users_id_fk" 
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_receiver_id_users_id_fk" 
    FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Step 3: Make fuzzy_geom nullable (we can compute it on the fly)
ALTER TABLE "voice_pins" ALTER COLUMN "fuzzy_geom" DROP NOT NULL;

-- Step 4: Drop fuzzy spatial index (we'll use exact geom for queries)
DROP INDEX IF EXISTS "fuzzy_spatial_index";

-- Step 5: Drop wallet_address column (not needed for Phase 1)
ALTER TABLE "users" DROP COLUMN IF EXISTS "wallet_address";
