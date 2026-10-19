-- +goose Up
ALTER TABLE stages ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done'));
ALTER TABLE stage_tasks ADD COLUMN done_at TEXT;

CREATE TABLE stage_files (
    id           INTEGER PRIMARY KEY,
    stage_id     INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    key          TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size         INTEGER NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX stage_files_stage_id ON stage_files(stage_id, id);

-- +goose StatementBegin
CREATE TRIGGER stages_status_only_when_signed BEFORE UPDATE OF status ON stages
WHEN (SELECT status FROM projects WHERE id = NEW.project_id) <> 'signed'
BEGIN
    SELECT RAISE(ABORT, 'stage status changes only after signature');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER stage_files_only_when_signed BEFORE INSERT ON stage_files
WHEN (SELECT p.status FROM stages s JOIN projects p ON p.id = s.project_id WHERE s.id = NEW.stage_id) <> 'signed'
BEGIN
    SELECT RAISE(ABORT, 'stage files are added only after signature');
END;
-- +goose StatementEnd

-- +goose Down
DROP TRIGGER stage_files_only_when_signed;
DROP TRIGGER stages_status_only_when_signed;
DROP TABLE stage_files;
ALTER TABLE stage_tasks DROP COLUMN done_at;
ALTER TABLE stages DROP COLUMN status;
