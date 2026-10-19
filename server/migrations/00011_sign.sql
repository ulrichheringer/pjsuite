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
    status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'sent', 'viewed', 'changes_requested', 'refused', 'signed')),
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

ALTER TABLE contract_versions ADD COLUMN note TEXT NOT NULL DEFAULT '';

CREATE TABLE signatures (
    project_id INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    version    INTEGER NOT NULL,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    ip         TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    hash       TEXT NOT NULL,
    signed_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (project_id, version) REFERENCES contract_versions(project_id, number)
) STRICT;

-- +goose StatementBegin
CREATE TRIGGER contract_versions_no_update BEFORE UPDATE ON contract_versions
BEGIN
    SELECT RAISE(ABORT, 'contract versions are immutable');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER contract_versions_no_delete BEFORE DELETE ON contract_versions
WHEN EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id)
BEGIN
    SELECT RAISE(ABORT, 'contract versions are immutable');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER contract_versions_no_insert_after_sign BEFORE INSERT ON contract_versions
WHEN EXISTS (SELECT 1 FROM signatures WHERE project_id = NEW.project_id)
BEGIN
    SELECT RAISE(ABORT, 'signed contracts accept no new versions');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER signatures_no_update BEFORE UPDATE ON signatures
BEGIN
    SELECT RAISE(ABORT, 'signatures are immutable');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER signatures_no_delete BEFORE DELETE ON signatures
WHEN EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id)
BEGIN
    SELECT RAISE(ABORT, 'signatures are immutable');
END;
-- +goose StatementEnd

COMMIT;
PRAGMA foreign_keys = ON;

-- +goose Down
PRAGMA foreign_keys = OFF;
BEGIN;

DROP TRIGGER contract_versions_no_insert_after_sign;
DROP TRIGGER signatures_no_delete;
DROP TRIGGER signatures_no_update;
DROP TRIGGER contract_versions_no_delete;
DROP TRIGGER contract_versions_no_update;
DROP TABLE signatures;
ALTER TABLE contract_versions DROP COLUMN note;

CREATE TABLE projects_old (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id   INTEGER NOT NULL REFERENCES clients(id),
    name        TEXT NOT NULL,
    area        TEXT NOT NULL DEFAULT '',
    reference   TEXT NOT NULL DEFAULT '',
    goal        TEXT NOT NULL DEFAULT '',
    structure   TEXT NOT NULL DEFAULT 'essential' CHECK (structure IN ('blank', 'essential', 'suggested')),
    status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'sent', 'viewed', 'changes_requested', 'refused')),
    archived_at TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    scope       TEXT NOT NULL DEFAULT '',
    outcome     TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL DEFAULT 0
) STRICT;

INSERT INTO projects_old (id, user_id, client_id, name, area, reference, goal, structure, status, archived_at, created_at, scope, outcome, notes, price_cents)
SELECT id, user_id, client_id, name, area, reference, goal, structure, CASE WHEN status = 'signed' THEN 'sent' ELSE status END, archived_at, created_at, scope, outcome, notes, price_cents FROM projects;

DROP TABLE projects;
ALTER TABLE projects_old RENAME TO projects;
CREATE INDEX projects_user_id ON projects(user_id);
CREATE INDEX projects_client_id ON projects(client_id);

COMMIT;
PRAGMA foreign_keys = ON;
