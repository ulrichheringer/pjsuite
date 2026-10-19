package api

import (
	"context"
	"database/sql"
	"net/http"
	"slices"
	"strconv"
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

func (st stage) input() stageInput {
	in := stageInput{Name: st.Name, TimingKind: st.TimingKind, Timing: st.Timing, Deliverable: st.Deliverable, Visible: st.Visible}
	for _, t := range st.Tasks {
		in.Tasks = append(in.Tasks, t.Title)
	}
	return in
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
	return id, insertTasks(ctx, tx, id, in.Tasks)
}

func insertTasks(ctx context.Context, tx *sql.Tx, stageID int64, titles []string) error {
	for i, title := range titles {
		if _, err := tx.ExecContext(ctx, `INSERT INTO stage_tasks (stage_id, position, title) VALUES (?, ?, ?)`, stageID, i+1, title); err != nil {
			return err
		}
	}
	return nil
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

func (s *server) writableProject(handle func(c *echo.Context, p project) error) echo.HandlerFunc {
	return func(c *echo.Context) error {
		p, err := s.findProject(c)
		if err != nil {
			return err
		}
		if p.Archived {
			return invalid(c, http.StatusConflict, fieldErrors{"archived": "Projeto arquivado."})
		}
		return handle(c, p)
	}
}

func (s *server) inTx(c *echo.Context, do func(ctx context.Context, tx *sql.Tx) error) error {
	ctx := c.Request().Context()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := do(ctx, tx); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *server) createStage(c *echo.Context, p project) error {
	in, errs, err := s.bindStage(c)
	if err != nil {
		return err
	}
	if len(errs) > 0 {
		return invalid(c, http.StatusBadRequest, errs)
	}
	var id int64
	err = s.inTx(c, func(ctx context.Context, tx *sql.Tx) (err error) {
		id, err = insertStage(ctx, tx, p.ID, in)
		return err
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, map[string]int64{"id": id})
}

func stageID(c *echo.Context) (int64, error) {
	id, err := strconv.ParseInt(c.Param("sid"), 10, 64)
	if err != nil {
		return 0, echo.ErrNotFound
	}
	return id, nil
}

func (s *server) putStage(c *echo.Context, p project) error {
	id, err := stageID(c)
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
	err = s.inTx(c, func(ctx context.Context, tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx,
			`UPDATE stages SET name = ?, timing_kind = ?, timing = ?, deliverable = ?, visible = ? WHERE id = ? AND project_id = ?`,
			in.Name, in.TimingKind, in.Timing, in.Deliverable, in.Visible, id, p.ID)
		if err != nil {
			return err
		}
		if err := requireAffected(res); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM stage_tasks WHERE stage_id = ?`, id); err != nil {
			return err
		}
		return insertTasks(ctx, tx, id, in.Tasks)
	})
	if err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func requireAffected(res sql.Result) error {
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return echo.ErrNotFound
	}
	return nil
}

func (s *server) deleteStage(c *echo.Context, p project) error {
	id, err := stageID(c)
	if err != nil {
		return err
	}
	res, err := s.db.ExecContext(c.Request().Context(), `DELETE FROM stages WHERE id = ? AND project_id = ?`, id, p.ID)
	if err != nil {
		return err
	}
	if err := requireAffected(res); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (s *server) putStageOrder(c *echo.Context, p project) error {
	var req struct {
		IDs []int64 `json:"ids"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.ErrBadRequest
	}
	current, err := s.loadStages(c.Request().Context(), p.ID)
	if err != nil {
		return err
	}
	want := make([]int64, len(current))
	for i, st := range current {
		want[i] = st.ID
	}
	if got := slices.Sorted(slices.Values(req.IDs)); !slices.Equal(got, slices.Sorted(slices.Values(want))) {
		return invalid(c, http.StatusBadRequest, fieldErrors{"ids": "Informe todas as etapas do projeto, uma vez cada."})
	}
	err = s.inTx(c, func(ctx context.Context, tx *sql.Tx) error {
		for i, id := range req.IDs {
			if _, err := tx.ExecContext(ctx, `UPDATE stages SET position = ? WHERE id = ?`, i+1, id); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

var starterStages = []stageInput{
	{Name: "Descoberta e alinhamento", TimingKind: "deadline", Timing: "Até 05 out", Tasks: []string{"Reunião de kickoff", "Confirmar objetivos e referências"}, Deliverable: "Briefing aprovado", Visible: true},
	{Name: "Execução", TimingKind: "period", Timing: "12 out · 14h às 22h", Tasks: []string{"Realizar o trabalho previsto", "Registrar decisões importantes"}, Deliverable: "Material bruto organizado", Visible: true},
	{Name: "Produção e refinamento", TimingKind: "relative", Timing: "Até 20 dias após a execução", Tasks: []string{"Preparar primeira versão", "Revisar qualidade da entrega"}, Deliverable: "Versão para revisão", Visible: true},
	{Name: "Entrega final", TimingKind: "deadline", Timing: "Até 12 nov", Tasks: []string{"Publicar arquivos finais"}, Deliverable: "Entrega final aprovada", Visible: true},
}

func seedStages(structure string) func(ctx context.Context, tx *sql.Tx, projectID int64) error {
	if structure == "blank" {
		return nil
	}
	return func(ctx context.Context, tx *sql.Tx, projectID int64) error {
		for _, in := range starterStages {
			if _, err := insertStage(ctx, tx, projectID, in); err != nil {
				return err
			}
		}
		return nil
	}
}
