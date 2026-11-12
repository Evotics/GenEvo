/*
# Sains Reborn Telegram Mini App — Database Schema

## Overview
Migrates the Discord bot's JSON database (keys + users) into proper Postgres tables.
The app authenticates via Telegram Web App initData (validated server-side in edge functions),
NOT Supabase Auth. All database access goes through edge functions using the service role key,
so RLS policies are locked down — the anon/authenticated roles get no direct table access.

## New Tables

### app_users
- `telegram_id` (bigint, primary key) — Telegram user ID from initData
- `username` (text, nullable) — Telegram username
- `first_name` (text, nullable) — Telegram first name
- `credits` (integer, default 0) — generation credits
- `revoked` (boolean, default false) — whether access has been revoked
- `access_expires_at` (timestamptz, nullable) — when access expires (null = never)
- `vouched` (boolean, default false) — whether user has vouched (first redemption)
- `redeemed_key_code` (text, nullable) — the key code they redeemed
- `created_at` (timestamptz, default now)

### keys
- `code` (text, primary key) — the key string (XXXX-XXXX-XXXX-XXXX format)
- `credits` (integer) — credits the key grants when redeemed
- `expires_at` (timestamptz, nullable) — when the key itself expires (null = never)
- `created_by` (bigint) — telegram_id of the admin who created it
- `created_at` (timestamptz, default now)
- `redeemed_by` (bigint, nullable) — telegram_id of who redeemed
- `redeemed_at` (timestamptz, nullable) — when it was redeemed

### generation_logs
- `id` (uuid, primary key)
- `telegram_id` (bigint) — who generated
- `ean` (text) — barcode digits used
- `price_pence` (integer) — price in pence
- `barcode_value` (text) — the full encoded barcode value
- `created_at` (timestamptz, default now)

### admins
- `telegram_id` (bigint, primary key) — Telegram user IDs who have admin access
- `created_at` (timestamptz, default now)

## Security
- RLS enabled on ALL tables.
- NO grants to anon or authenticated — all access is via edge functions with service_role.
- The frontend never touches these tables directly.
- service_role bypasses RLS but still needs grants, so we grant full CRUD to service_role.
*/

CREATE TABLE IF NOT EXISTS app_users (
  telegram_id bigint PRIMARY KEY,
  username text,
  first_name text,
  credits integer NOT NULL DEFAULT 0,
  revoked boolean NOT NULL DEFAULT false,
  access_expires_at timestamptz,
  vouched boolean NOT NULL DEFAULT false,
  redeemed_key_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_users TO service_role;

CREATE TABLE IF NOT EXISTS keys (
  code text PRIMARY KEY,
  credits integer NOT NULL,
  expires_at timestamptz,
  created_by bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  redeemed_by bigint,
  redeemed_at timestamptz
);

ALTER TABLE keys ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON keys TO service_role;

CREATE TABLE IF NOT EXISTS generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL,
  ean text NOT NULL,
  price_pence integer NOT NULL,
  barcode_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON generation_logs TO service_role;

CREATE TABLE IF NOT EXISTS admins (
  telegram_id bigint PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON admins TO service_role;

-- Index for looking up keys by redeemed_by
CREATE INDEX IF NOT EXISTS idx_keys_redeemed_by ON keys(redeemed_by);
-- Index for looking up logs by user
CREATE INDEX IF NOT EXISTS idx_gen_logs_telegram_id ON generation_logs(telegram_id);
-- Index for listing unredeemed keys
CREATE INDEX IF NOT EXISTS idx_keys_redeemed_by_null ON keys(redeemed_by) WHERE redeemed_by IS NULL;
