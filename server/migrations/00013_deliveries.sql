-- +goose Up
CREATE TABLE deliveries (
    id           INTEGER PRIMARY KEY,
    project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    number       INTEGER,
    title        TEXT NOT NULL DEFAULT '',
    message      TEXT NOT NULL DEFAULT '',
    published_at TEXT,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK ((number IS NULL) = (published_at IS NULL))
) STRICT;

CREATE UNIQUE INDEX deliveries_one_draft ON deliveries(project_id) WHERE published_at IS NULL;
CREATE UNIQUE INDEX deliveries_number ON deliveries(project_id, number) WHERE number IS NOT NULL;

CREATE TABLE delivery_files (
    id           INTEGER PRIMARY KEY,
    delivery_id  INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    key          TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size         INTEGER NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX delivery_files_delivery_id ON delivery_files(delivery_id, id);

-- +goose StatementBegin
CREATE TRIGGER deliveries_only_when_signed BEFORE INSERT ON deliveries
WHEN (SELECT status FROM projects WHERE id = NEW.project_id) <> 'signed'
BEGIN
    SELECT RAISE(ABORT, 'deliveries are drafted only after signature');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER deliveries_published_no_update BEFORE UPDATE ON deliveries
WHEN OLD.published_at IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'published deliveries are immutable');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER deliveries_published_no_delete BEFORE DELETE ON deliveries
WHEN OLD.published_at IS NOT NULL AND EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id)
BEGIN
    SELECT RAISE(ABORT, 'published deliveries are immutable');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER delivery_files_only_in_signed_draft BEFORE INSERT ON delivery_files
WHEN NOT EXISTS (
    SELECT 1 FROM deliveries d JOIN projects p ON p.id = d.project_id
    WHERE d.id = NEW.delivery_id AND d.published_at IS NULL AND p.status = 'signed')
BEGIN
    SELECT RAISE(ABORT, 'delivery files are added only to a draft of a signed project');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER delivery_files_published_no_update BEFORE UPDATE ON delivery_files
WHEN EXISTS (SELECT 1 FROM deliveries WHERE id = OLD.delivery_id AND published_at IS NOT NULL)
BEGIN
    SELECT RAISE(ABORT, 'published delivery files are immutable');
END;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER delivery_files_published_no_delete BEFORE DELETE ON delivery_files
WHEN EXISTS (SELECT 1 FROM deliveries WHERE id = OLD.delivery_id AND published_at IS NOT NULL)
BEGIN
    SELECT RAISE(ABORT, 'published delivery files are immutable');
END;
-- +goose StatementEnd

-- +goose Down
DROP TRIGGER delivery_files_published_no_delete;
DROP TRIGGER delivery_files_published_no_update;
DROP TRIGGER delivery_files_only_in_signed_draft;
DROP TRIGGER deliveries_published_no_delete;
DROP TRIGGER deliveries_published_no_update;
DROP TRIGGER deliveries_only_when_signed;
DROP TABLE delivery_files;
DROP TABLE deliveries;
