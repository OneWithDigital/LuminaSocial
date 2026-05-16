-- ============================================================
-- Migration 003: Phase 2 — Calendar, Credits, Coach
-- Run this in pgAdmin Query Tool against your luminasocial DB
-- ============================================================

-- Post bundles: link remixed posts together
CREATE TABLE IF NOT EXISTS post_bundles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type TEXT NOT NULL DEFAULT 'text',
    source_url  TEXT,
    summary     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS bundle_id UUID REFERENCES post_bundles(id);

-- Remix usage: one row per /remix/generate call (credits tracking)
CREATE TABLE IF NOT EXISTS remix_usage (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remix_usage_created_at ON remix_usage (created_at DESC);
