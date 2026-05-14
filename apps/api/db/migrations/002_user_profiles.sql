CREATE TABLE user_profiles (
    id                  SERIAL PRIMARY KEY,
    display_name        TEXT NOT NULL DEFAULT 'My Brand',
    avatar_url          TEXT,
    website_url         TEXT,
    bio                 TEXT,
    brand_voice         TEXT,
    brand_colors        TEXT[] DEFAULT '{}',
    brand_keywords      TEXT[] DEFAULT '{}',
    connected_accounts  JSONB NOT NULL DEFAULT '{}',
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO user_profiles (display_name) VALUES ('My Brand');
