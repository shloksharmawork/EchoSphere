CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text,
	"email" text,
	"wallet_address" text,
	"is_anonymous" boolean DEFAULT false,
	"reputation_score" integer DEFAULT 100,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "voice_pins" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_id" integer,
	"title" text,
	"audio_url" text NOT NULL,
	"geom" geometry(Point, 4326) NOT NULL,
	"fuzzy_geom" geometry(Point, 4326) NOT NULL,
	"location_name" text,
	"is_anonymous_post" boolean DEFAULT false,
	"voice_masking_enabled" boolean DEFAULT false,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "connection_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" integer NOT NULL,
	"receiver_id" integer NOT NULL,
	"status" text DEFAULT 'PENDING',
	"audio_intro_url" text,
	"created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "spatial_index" ON "voice_pins" USING GIST ("geom");
CREATE INDEX IF NOT EXISTS "fuzzy_spatial_index" ON "voice_pins" USING GIST ("fuzzy_geom");
