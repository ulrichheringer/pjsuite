-- +goose Up
CREATE TABLE attachments (
    id           INTEGER PRIMARY KEY,
    project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key          TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size         INTEGER NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX attachments_project_id ON attachments(project_id, id);

-- +goose Down
DROP TABLE attachments;
