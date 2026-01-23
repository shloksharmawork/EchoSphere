-- EchoSphere Setup: Enable PostGIS Extension
-- Run this in your Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify extension is active
SELECT postgis_full_version();
