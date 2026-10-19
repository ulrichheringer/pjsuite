-- +goose Up
ALTER TABLE projects ADD COLUMN price_cents INTEGER NOT NULL DEFAULT 0;

CREATE TABLE payments (
    id         INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    position   INTEGER NOT NULL,
    kind       TEXT NOT NULL CHECK (kind IN ('entrada', 'parcela', 'saldo', 'unico')),
    percent    INTEGER NOT NULL CHECK (percent BETWEEN 0 AND 100),
    trigger    TEXT NOT NULL CHECK (trigger IN ('assinatura', 'data', 'etapa', 'antes_entrega', 'apos_aprovacao')),
    due        TEXT NOT NULL DEFAULT ''
) STRICT;

CREATE INDEX payments_project_id ON payments(project_id, position);

-- +goose Down
DROP TABLE payments;
ALTER TABLE projects DROP COLUMN price_cents;
