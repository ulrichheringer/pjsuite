-- +goose Up
CREATE TABLE project_blocks (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    block      TEXT NOT NULL CHECK (block IN ('scope', 'stages', 'deliverables', 'price', 'attachments')),
    visible    INTEGER NOT NULL CHECK (visible IN (0, 1)),
    PRIMARY KEY (project_id, block)
) STRICT, WITHOUT ROWID;

-- +goose Down
DROP TABLE project_blocks;
