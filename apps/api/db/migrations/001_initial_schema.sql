-- ============================================================
-- LuminaSocial Ultra — Initial Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------

CREATE TYPE post_status AS ENUM (
    'Draft',
    'Pending',       -- awaiting manual approval in the dashboard
    'Approved',      -- approved, queued for publishing
    'Published',     -- live on the target platform
    'Rejected'       -- failed brand guardrail or manually rejected
);

CREATE TYPE platform_target AS ENUM (
    'instagram',
    'tiktok',
    'youtube_shorts',
    'twitter',
    'linkedin'
);

CREATE TYPE performance_tier AS ENUM (
    'Low',
    'Mid',
    'Viral'
);

CREATE TYPE video_style AS ENUM (
    'fast_aggressive',   -- Variant A default style
    'cinematic_minimal'  -- Variant B default style
);

-- ----------------------------------------------------------------
-- TRENDS
-- Stores ingested trending topics from external APIs (SerpApi, etc.)
-- ----------------------------------------------------------------

CREATE TABLE trends (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword         TEXT NOT NULL,
    source          TEXT NOT NULL,                  -- e.g. "serpapi", "google_trends"
    source_url      TEXT,
    region          VARCHAR(10) DEFAULT 'US',
    search_volume   INTEGER,
    related_topics  JSONB DEFAULT '[]',             -- array of related keyword strings
    raw_payload     JSONB,                          -- full API response for traceability
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,                    -- trend shelf-life hint
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trends_keyword ON trends (keyword);
CREATE INDEX idx_trends_fetched_at ON trends (fetched_at DESC);
CREATE INDEX idx_trends_region ON trends (region);

-- ----------------------------------------------------------------
-- POSTS
-- Central table: one row per content idea, carrying both A/B variants.
-- ----------------------------------------------------------------

CREATE TABLE posts (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Content origin
    trend_id                UUID REFERENCES trends (id) ON DELETE SET NULL,
    title                   TEXT NOT NULL,
    raw_prompt              TEXT NOT NULL,          -- the generation prompt sent to the video factory
    caption_draft           TEXT,                   -- AI-generated caption, pre-guardrail

    -- A/B Variant file paths (relative to /storage/outputs/)
    variant_a_path          TEXT,                   -- fast_aggressive cut
    variant_b_path          TEXT,                   -- cinematic_minimal cut
    variant_a_style         video_style NOT NULL DEFAULT 'fast_aggressive',
    variant_b_style         video_style NOT NULL DEFAULT 'cinematic_minimal',
    variant_a_duration_sec  NUMERIC(6,2),
    variant_b_duration_sec  NUMERIC(6,2),

    -- Brand Guardrail
    brand_alignment_score   NUMERIC(4,1),           -- 0–100 score from LLM check
    guardrail_passed        BOOLEAN,
    guardrail_notes         TEXT,                   -- LLM explanation / rejection reason
    guardrail_checked_at    TIMESTAMPTZ,

    -- Workflow
    status                  post_status NOT NULL DEFAULT 'Draft',
    platform_target         platform_target NOT NULL DEFAULT 'instagram',
    scheduled_at            TIMESTAMPTZ,            -- when Approved, set publish time
    published_at            TIMESTAMPTZ,
    approved_by             TEXT,                   -- operator identifier from dashboard
    approved_at             TIMESTAMPTZ,

    -- Feedback loop influence
    winning_variant         CHAR(1),                -- 'A' or 'B', set by analytics worker
    lessons_applied         JSONB DEFAULT '[]',     -- refs to lessons_learned ids used

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_status ON posts (status);
CREATE INDEX idx_posts_platform_target ON posts (platform_target);
CREATE INDEX idx_posts_trend_id ON posts (trend_id);
CREATE INDEX idx_posts_scheduled_at ON posts (scheduled_at);
CREATE INDEX idx_posts_created_at ON posts (created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------
-- ANALYTICS
-- Raw engagement data per variant, plus derived performance tier.
-- ----------------------------------------------------------------

CREATE TABLE analytics (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id             UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    variant             CHAR(1) NOT NULL CHECK (variant IN ('A', 'B')),

    -- Raw platform metrics (nullable; populated as data arrives)
    likes               INTEGER DEFAULT 0,
    shares              INTEGER DEFAULT 0,
    comments            INTEGER DEFAULT 0,
    views               INTEGER DEFAULT 0,
    watch_time_sec      NUMERIC(10,2) DEFAULT 0,    -- total seconds watched
    click_through_rate  NUMERIC(5,4) DEFAULT 0,     -- 0.0000–1.0000
    saves               INTEGER DEFAULT 0,

    -- Derived
    engagement_rate     NUMERIC(6,4)                -- (likes+comments+shares) / views
        GENERATED ALWAYS AS (
            CASE WHEN views > 0
                THEN ROUND((likes + comments + shares)::NUMERIC / views, 4)
                ELSE 0
            END
        ) STORED,
    performance_tier    performance_tier,           -- set by analytics worker

    -- Metadata
    platform            platform_target NOT NULL,
    snapshot_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- when metrics were pulled
    raw_payload         JSONB,                      -- full platform API response

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_post_id ON analytics (post_id);
CREATE INDEX idx_analytics_variant ON analytics (variant);
CREATE INDEX idx_analytics_performance_tier ON analytics (performance_tier);
CREATE INDEX idx_analytics_snapshot_at ON analytics (snapshot_at DESC);

-- ----------------------------------------------------------------
-- LESSONS_LEARNED
-- Written by the analytics feedback worker; read by the video factory
-- to bias future generation prompts.
-- ----------------------------------------------------------------

CREATE TABLE lessons_learned (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id             UUID REFERENCES posts (id) ON DELETE SET NULL,

    summary             TEXT NOT NULL,              -- LLM-generated insight
    winning_style       video_style,                -- style that outperformed
    winning_platform    platform_target,
    engagement_delta    NUMERIC(6,4),               -- difference between A/B engagement rates
    recommended_bias    JSONB DEFAULT '{}',         -- structured hints for next factory run
    -- e.g. {"prefer_style": "fast_aggressive", "hook_duration_sec": 3, "caption_tone": "urgent"}

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lessons_created_at ON lessons_learned (created_at DESC);
CREATE INDEX idx_lessons_winning_style ON lessons_learned (winning_style);

-- ----------------------------------------------------------------
-- SEED: default brand configuration row (used by the guardrail module)
-- ----------------------------------------------------------------

CREATE TABLE brand_config (
    id                  SERIAL PRIMARY KEY,
    config_key          TEXT UNIQUE NOT NULL,
    config_value        JSONB NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_brand_config_updated_at
    BEFORE UPDATE ON brand_config
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO brand_config (config_key, config_value) VALUES
    ('guardrail_thresholds', '{"min_brand_score": 70, "auto_reject_below": 40}'),
    ('ab_test_defaults',     '{"variant_a_style": "fast_aggressive", "variant_b_style": "cinematic_minimal"}'),
    ('platform_targets',     '["instagram", "tiktok", "youtube_shorts"]');
