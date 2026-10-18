-- +goose Up
ALTER TABLE users ADD COLUMN terms_accepted_at TEXT;

CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
) STRICT;

CREATE TABLE profiles (
    user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    business_name TEXT NOT NULL DEFAULT '',
    contact_email TEXT NOT NULL,
    phone         TEXT NOT NULL DEFAULT '',
    area          TEXT NOT NULL DEFAULT '',
    city          TEXT NOT NULL DEFAULT '',
    bio           TEXT NOT NULL DEFAULT '',
    avatar        BLOB,
    avatar_type   TEXT NOT NULL DEFAULT ''
) STRICT;

INSERT INTO profiles (user_id, name, contact_email) SELECT id, name, email FROM users;

-- +goose Down
DROP TABLE profiles;
DROP TABLE sessions;
ALTER TABLE users DROP COLUMN terms_accepted_at;
