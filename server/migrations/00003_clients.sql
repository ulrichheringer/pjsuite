-- +goose Up
CREATE TABLE clients (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL DEFAULT '',
    phone       TEXT NOT NULL DEFAULT '',
    company     TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT '',
    stage       TEXT NOT NULL DEFAULT 'recent' CHECK (stage IN ('recent', 'proposal', 'active')),
    archived_at TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX clients_user_id ON clients(user_id);

-- +goose Down
DROP TABLE clients;
