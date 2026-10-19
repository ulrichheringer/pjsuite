-- +goose Up
ALTER TABLE projects ADD COLUMN completed_at TEXT;

CREATE TABLE delivery_responses (
    id          INTEGER PRIMARY KEY,
    delivery_id INTEGER NOT NULL UNIQUE REFERENCES deliveries(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL CHECK (kind IN ('adjust', 'approve')),
    message     TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- +goose StatementBegin
CREATE TRIGGER delivery_responses_only_on_latest BEFORE INSERT ON delivery_responses
WHEN NOT EXISTS (
    SELECT 1 FROM deliveries d JOIN projects p ON p.id = d.project_id
    WHERE d.id = NEW.delivery_id AND p.status = 'signed' AND p.completed_at IS NULL
    AND d.number = (SELECT MAX(number) FROM deliveries WHERE project_id = d.project_id))
BEGIN
    SELECT RAISE(ABORT, 'responses need the latest delivery of a signed, not completed project');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER delivery_responses_no_update BEFORE UPDATE ON delivery_responses
BEGIN
    SELECT RAISE(ABORT, 'delivery responses are immutable');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER delivery_responses_no_delete BEFORE DELETE ON delivery_responses
WHEN EXISTS (SELECT 1 FROM deliveries WHERE id = OLD.delivery_id)
BEGIN
    SELECT RAISE(ABORT, 'delivery responses are immutable');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER projects_completed_is_final BEFORE UPDATE OF completed_at ON projects
WHEN OLD.completed_at IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'a completed project cannot be reopened');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER stages_status_not_completed BEFORE UPDATE OF status ON stages
WHEN (SELECT completed_at FROM projects WHERE id = NEW.project_id) IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'completed projects are frozen');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER stage_files_not_completed BEFORE INSERT ON stage_files
WHEN (SELECT p.completed_at FROM stages s JOIN projects p ON p.id = s.project_id WHERE s.id = NEW.stage_id) IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'completed projects are frozen');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER deliveries_not_completed BEFORE INSERT ON deliveries
WHEN (SELECT completed_at FROM projects WHERE id = NEW.project_id) IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'completed projects are frozen');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER deliveries_publish_not_completed BEFORE UPDATE ON deliveries
WHEN OLD.published_at IS NULL AND (SELECT completed_at FROM projects WHERE id = NEW.project_id) IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'completed projects are frozen');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER delivery_files_insert_not_completed BEFORE INSERT ON delivery_files
WHEN (SELECT p.completed_at FROM deliveries d JOIN projects p ON p.id = d.project_id WHERE d.id = NEW.delivery_id) IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'completed projects are frozen');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER delivery_files_delete_not_completed BEFORE DELETE ON delivery_files
WHEN (SELECT p.completed_at FROM deliveries d JOIN projects p ON p.id = d.project_id WHERE d.id = OLD.delivery_id) IS NOT NULL
 AND EXISTS (SELECT 1 FROM deliveries WHERE id = OLD.delivery_id)
BEGIN
    SELECT RAISE(ABORT, 'completed projects are frozen');
END;
-- +goose StatementEnd

-- +goose Down
DROP TRIGGER delivery_files_delete_not_completed;
DROP TRIGGER delivery_files_insert_not_completed;
DROP TRIGGER deliveries_publish_not_completed;
DROP TRIGGER deliveries_not_completed;
DROP TRIGGER stage_files_not_completed;
DROP TRIGGER stages_status_not_completed;
DROP TRIGGER projects_completed_is_final;
DROP TRIGGER delivery_responses_no_delete;
DROP TRIGGER delivery_responses_no_update;
DROP TRIGGER delivery_responses_only_on_latest;
DROP TABLE delivery_responses;
ALTER TABLE projects DROP COLUMN completed_at;
