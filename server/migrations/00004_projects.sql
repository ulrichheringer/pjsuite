-- +goose Up
CREATE TABLE projects (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id   INTEGER NOT NULL REFERENCES clients(id),
    name        TEXT NOT NULL,
    area        TEXT NOT NULL DEFAULT '',
    reference   TEXT NOT NULL DEFAULT '',
    goal        TEXT NOT NULL DEFAULT '',
    structure   TEXT NOT NULL DEFAULT 'essential' CHECK (structure IN ('blank', 'essential', 'suggested')),
    status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft')),
    archived_at TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX projects_user_id ON projects(user_id);
CREATE INDEX projects_client_id ON projects(client_id);

-- +goose Down
DROP TABLE projects;
