-- EchoSphere Schema Fix: Add missing columns to users table
-- Run this in your Supabase SQL Editor

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" text UNIQUE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country_code" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hashed_password" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_phone_verified" boolean DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_anonymous" boolean DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reputation_score" integer DEFAULT 100;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;

-- Also ensure the phone_verifications table is correct if it was missing
CREATE TABLE IF NOT EXISTS "phone_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
