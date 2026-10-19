-- +goose Up
ALTER TABLE projects ADD COLUMN scope TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN outcome TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN notes TEXT NOT NULL DEFAULT '';

CREATE TABLE stages (
    id          INTEGER PRIMARY KEY,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL,
    name        TEXT NOT NULL,
    timing_kind TEXT NOT NULL DEFAULT 'none' CHECK (timing_kind IN ('deadline', 'date', 'period', 'relative', 'milestone', 'none')),
    timing      TEXT NOT NULL DEFAULT '',
    deliverable TEXT NOT NULL DEFAULT '',
    visible     INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1))
) STRICT;

CREATE INDEX stages_project_id ON stages(project_id, position);

CREATE TABLE stage_tasks (
    id       INTEGER PRIMARY KEY,
    stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    title    TEXT NOT NULL
) STRICT;

CREATE INDEX stage_tasks_stage_id ON stage_tasks(stage_id, position);

-- +goose Down
DROP TABLE stage_tasks;
DROP TABLE stages;
ALTER TABLE projects DROP COLUMN notes;
ALTER TABLE projects DROP COLUMN outcome;
ALTER TABLE projects DROP COLUMN scope;
