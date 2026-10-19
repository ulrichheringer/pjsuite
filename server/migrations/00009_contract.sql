-- +goose NO TRANSACTION
-- +goose Up
PRAGMA foreign_keys = OFF;
BEGIN;

CREATE TABLE projects_new (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id   INTEGER NOT NULL REFERENCES clients(id),
    name        TEXT NOT NULL,
    area        TEXT NOT NULL DEFAULT '',
    reference   TEXT NOT NULL DEFAULT '',
    goal        TEXT NOT NULL DEFAULT '',
    structure   TEXT NOT NULL DEFAULT 'essential' CHECK (structure IN ('blank', 'essential', 'suggested')),
    status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
    archived_at TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    scope       TEXT NOT NULL DEFAULT '',
    outcome     TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL DEFAULT 0
) STRICT;

INSERT INTO projects_new (id, user_id, client_id, name, area, reference, goal, structure, status, archived_at, created_at, scope, outcome, notes, price_cents)
SELECT id, user_id, client_id, name, area, reference, goal, structure, status, archived_at, created_at, scope, outcome, notes, price_cents FROM projects;

DROP TABLE projects;
ALTER TABLE projects_new RENAME TO projects;
CREATE INDEX projects_user_id ON projects(user_id);
CREATE INDEX projects_client_id ON projects(client_id);

CREATE TABLE contract_versions (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    number     INTEGER NOT NULL CHECK (number >= 1),
    content    TEXT NOT NULL,
    hash       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (project_id, number)
) STRICT, WITHOUT ROWID;

COMMIT;
PRAGMA foreign_keys = ON;

-- +goose Down
PRAGMA foreign_keys = OFF;
BEGIN;

DROP TABLE contract_versions;

CREATE TABLE projects_old (
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
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    scope       TEXT NOT NULL DEFAULT '',
    outcome     TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL DEFAULT 0
) STRICT;

INSERT INTO projects_old (id, user_id, client_id, name, area, reference, goal, structure, status, archived_at, created_at, scope, outcome, notes, price_cents)
SELECT id, user_id, client_id, name, area, reference, goal, structure, 'draft', archived_at, created_at, scope, outcome, notes, price_cents FROM projects;

DROP TABLE projects;
ALTER TABLE projects_old RENAME TO projects;
CREATE INDEX projects_user_id ON projects(user_id);
CREATE INDEX projects_client_id ON projects(client_id);

COMMIT;
PRAGMA foreign_keys = ON;
