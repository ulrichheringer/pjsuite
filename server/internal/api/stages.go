package api

import (
	"context"
	"database/sql"
	"net/http"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/labstack/echo/v5"
)

const (
	maxStageNameRunes   = 120
	maxStageTimingRunes = 120
	maxStageTextRunes   = 200
)

var timingKinds = []string{"deadline", "date", "period", "relative", "milestone", "none"}

type stageTask struct {
	ID    int64  `json:"id"`
	Title string `json:"title"`
}

type stage struct {
	ID          int64       `json:"id"`
	Name        string      `json:"name"`
	TimingKind  string      `json:"timingKind"`
	Timing      string      `json:"timing"`
	Deliverable string      `json:"deliverable"`
	Visible     bool        `json:"visible"`
	Tasks       []stageTask `json:"tasks"`
}

type stageInput struct {
	Name        string   `json:"name"`
	TimingKind  string   `json:"timingKind"`
	Timing      string   `json:"timing"`
	Deliverable string   `json:"deliverable"`
	Visible     bool     `json:"visible"`
	Tasks       []string `json:"tasks"`
}

func (in *stageInput) normalize() {
	in.Name = strings.TrimSpace(in.Name)
	in.Timing = strings.TrimSpace(in.Timing)
	in.Deliverable = strings.TrimSpace(in.Deliverable)
	if in.TimingKind == "none" {
		in.Timing = ""
	}
	tasks := in.Tasks[:0]
	for _, title := range in.Tasks {
		if title = strings.TrimSpace(title); title != "" {
			tasks = append(tasks, title)
		}
	}
	in.Tasks = tasks
}

func (in stageInput) validate() fieldErrors {
	errs := fieldErrors{}
	if in.Name == "" || utf8.RuneCountInString(in.Name) > maxStageNameRunes {
		errs["name"] = "Informe o nome da etapa (até 120 caracteres)."
	}
	if !slices.Contains(timingKinds, in.TimingKind) {
		errs["timingKind"] = "Escolha um tipo de prazo."
	}
	if utf8.RuneCountInString(in.Timing) > maxStageTimingRunes {
		errs["timing"] = "Use até 120 caracteres."
	}
	if utf8.RuneCountInString(in.Deliverable) > maxStageTextRunes {
		errs["deliverable"] = "Use até 200 caracteres."
	}
	for _, title := range in.Tasks {
		if utf8.RuneCountInString(title) > maxStageTextRunes {
			errs["tasks"] = "Cada tarefa pode ter até 200 caracteres."
		}
	}
	return errs
}

func (s *server) bindStage(c *echo.Context) (stageInput, fieldErrors, error) {
	var in stageInput
	if err := c.Bind(&in); err != nil {
		return in, nil, echo.ErrBadRequest
	}
	in.normalize()
	return in, in.validate(), nil
}

func insertStage(ctx context.Context, tx *sql.Tx, projectID int64, in stageInput) (int64, error) {
	var id int64
	err := tx.QueryRowContext(ctx,
		`INSERT INTO stages (project_id, position, name, timing_kind, timing, deliverable, visible)
		VALUES (?, (SELECT COALESCE(MAX(position), 0) + 1 FROM stages WHERE project_id = ?), ?, ?, ?, ?, ?) RETURNING id`,
		projectID, projectID, in.Name, in.TimingKind, in.Timing, in.Deliverable, in.Visible).Scan(&id)
	if err != nil {
		return 0, err
	}
	for i, title := range in.Tasks {
		if _, err := tx.ExecContext(ctx, `INSERT INTO stage_tasks (stage_id, position, title) VALUES (?, ?, ?)`, id, i+1, title); err != nil {
			return 0, err
		}
	}
	return id, nil
}

func (s *server) loadStages(ctx context.Context, projectID int64) ([]stage, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, name, timing_kind, timing, deliverable, visible FROM stages WHERE project_id = ? ORDER BY position`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	stages := []stage{}
	for rows.Next() {
		st := stage{Tasks: []stageTask{}}
		if err := rows.Scan(&st.ID, &st.Name, &st.TimingKind, &st.Timing, &st.Deliverable, &st.Visible); err != nil {
			return nil, err
		}
		stages = append(stages, st)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	index := map[int64]*stage{}
	for i := range stages {
		index[stages[i].ID] = &stages[i]
	}
	taskRows, err := s.db.QueryContext(ctx,
		`SELECT t.stage_id, t.id, t.title FROM stage_tasks t JOIN stages st ON st.id = t.stage_id
		WHERE st.project_id = ? ORDER BY t.position`, projectID)
	if err != nil {
		return nil, err
	}
	defer taskRows.Close()
	for taskRows.Next() {
		var stageID int64
		var t stageTask
		if err := taskRows.Scan(&stageID, &t.ID, &t.Title); err != nil {
			return nil, err
		}
		index[stageID].Tasks = append(index[stageID].Tasks, t)
	}
	return stages, taskRows.Err()
}

func (s *server) listStages(c *echo.Context) error {
	p, err := s.findProject(c)
	if err != nil {
		return err
	}
	stages, err := s.loadStages(c.Request().Context(), p.ID)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, stages)
}

func (s *server) createStage(c *echo.Context) error {
	p, err := s.findProject(c)
	if err != nil {
		return err
	}
	in, errs, err := s.bindStage(c)
	if err != nil {
		return err
	}
	if len(errs) > 0 {
		return invalid(c, http.StatusBadRequest, errs)
	}
	ctx := c.Request().Context()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	id, err := insertStage(ctx, tx, p.ID, in)
	if err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, map[string]int64{"id": id})
}
