-- +goose Up
CREATE TABLE project_events (
    id         INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL CHECK (kind IN (
        'project_created', 'contract_finalized', 'version_shared', 'client_viewed', 'change_requested', 'refused',
        'revision_created', 'signed', 'delivery_published', 'adjust_requested', 'approved', 'completed', 'archived')),
    actor      TEXT NOT NULL CHECK (actor IN ('pro', 'client')),
    actor_name TEXT NOT NULL,
    number     INTEGER NOT NULL DEFAULT 0,
    message    TEXT NOT NULL DEFAULT '',
    shared     INTEGER NOT NULL CHECK (shared IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    read_at    TEXT
) STRICT;
CREATE INDEX project_events_project_id ON project_events(project_id);

-- +goose StatementBegin
CREATE TRIGGER project_events_no_update BEFORE UPDATE ON project_events
WHEN OLD.read_at IS NOT NULL OR NEW.id IS NOT OLD.id OR NEW.project_id IS NOT OLD.project_id OR NEW.kind IS NOT OLD.kind
  OR NEW.actor IS NOT OLD.actor OR NEW.actor_name IS NOT OLD.actor_name OR NEW.number IS NOT OLD.number
  OR NEW.message IS NOT OLD.message OR NEW.shared IS NOT OLD.shared OR NEW.created_at IS NOT OLD.created_at
BEGIN
    SELECT RAISE(ABORT, 'events are append-only');
END;
-- +goose StatementEnd

-- +goose Down
DROP TRIGGER project_events_no_update;
DROP TABLE project_events;
