package api

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/labstack/echo/v5"
)

type executionStage struct {
	stage
	Files []attachment `json:"files"`
}

func (s *server) executableProject(handle func(c *echo.Context, p project) error) echo.HandlerFunc {
	return func(c *echo.Context) error {
		p, err := s.findProject(c)
		if err != nil {
			return err
		}
		if p.Archived {
			return invalid(c, http.StatusConflict, fieldErrors{"archived": "Projeto arquivado."})
		}
		if p.Status != "signed" {
			return invalid(c, http.StatusConflict, fieldErrors{"execution": "A execução começa após a assinatura."})
		}
		return handle(c, p)
	}
}

func (s *server) loadStageFiles(ctx context.Context, projectID int64) (map[int64][]attachment, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT f.stage_id, f.id, f.name, f.content_type, f.size, f.created_at FROM stage_files f JOIN stages st ON st.id = f.stage_id
		WHERE st.project_id = ? ORDER BY f.id`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	files := map[int64][]attachment{}
	for rows.Next() {
		var stageID int64
		var f attachment
		if err := rows.Scan(&stageID, &f.ID, &f.Name, &f.ContentType, &f.Size, &f.CreatedAt); err != nil {
			return nil, err
		}
		files[stageID] = append(files[stageID], f)
	}
	return files, rows.Err()
}

func (s *server) getExecution(c *echo.Context) error {
	p, err := s.findProject(c)
	if err != nil {
		return err
	}
	ctx := c.Request().Context()
	stages, err := s.loadStages(ctx, p.ID)
	if err != nil {
		return err
	}
	files, err := s.loadStageFiles(ctx, p.ID)
	if err != nil {
		return err
	}
	list := make([]executionStage, len(stages))
	for i, st := range stages {
		list[i] = executionStage{stage: st, Files: files[st.ID]}
		if list[i].Files == nil {
			list[i].Files = []attachment{}
		}
	}
	return c.JSON(http.StatusOK, list)
}

func taskTitleErrors(title string) fieldErrors {
	if title == "" || utf8.RuneCountInString(title) > maxStageTextRunes {
		return fieldErrors{"title": "Informe a tarefa (até 200 caracteres)."}
	}
	return nil
}

func (s *server) addTask(c *echo.Context, p project) error {
	id, err := stageID(c)
	if err != nil {
		return err
	}
	var in struct {
		Title string `json:"title"`
	}
	if err := c.Bind(&in); err != nil {
		return echo.ErrBadRequest
	}
	t := stageTask{Title: strings.TrimSpace(in.Title)}
	if errs := taskTitleErrors(t.Title); errs != nil {
		return invalid(c, http.StatusBadRequest, errs)
	}
	err = s.db.QueryRowContext(c.Request().Context(),
		`INSERT INTO stage_tasks (stage_id, position, title)
		SELECT st.id, COALESCE((SELECT MAX(position) FROM stage_tasks WHERE stage_id = st.id), 0) + 1, ?
		FROM stages st WHERE st.id = ? AND st.project_id = ? RETURNING id`, t.Title, id, p.ID).Scan(&t.ID)
	if errors.Is(err, sql.ErrNoRows) {
		return echo.ErrNotFound
	}
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, t)
}

func taskID(c *echo.Context) (int64, error) {
	id, err := strconv.ParseInt(c.Param("tid"), 10, 64)
	if err != nil {
		return 0, echo.ErrNotFound
	}
	return id, nil
}

func (s *server) putTask(c *echo.Context, p project) error {
	id, err := taskID(c)
	if err != nil {
		return err
	}
	var in struct {
		Title *string `json:"title"`
		Done  *bool   `json:"done"`
	}
	if err := c.Bind(&in); err != nil {
		return echo.ErrBadRequest
	}
	if in.Title != nil {
		title := strings.TrimSpace(*in.Title)
		in.Title = &title
		if errs := taskTitleErrors(title); errs != nil {
			return invalid(c, http.StatusBadRequest, errs)
		}
	}
	res, err := s.db.ExecContext(c.Request().Context(),
		`UPDATE stage_tasks SET title = COALESCE(?, title),
		done_at = CASE WHEN ? IS NULL THEN done_at WHEN ? THEN COALESCE(done_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) END
		WHERE id = ? AND stage_id IN (SELECT id FROM stages WHERE project_id = ?)`,
		in.Title, in.Done, in.Done, id, p.ID)
	if err != nil {
		return err
	}
	if err := requireAffected(res); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (s *server) deleteTask(c *echo.Context, p project) error {
	id, err := taskID(c)
	if err != nil {
		return err
	}
	res, err := s.db.ExecContext(c.Request().Context(),
		`DELETE FROM stage_tasks WHERE id = ? AND stage_id IN (SELECT id FROM stages WHERE project_id = ?)`, id, p.ID)
	if err != nil {
		return err
	}
	if err := requireAffected(res); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

var stageStatuses = []string{"pending", "in_progress", "done"}

func (s *server) putStageStatus(c *echo.Context, p project) error {
	id, err := stageID(c)
	if err != nil {
		return err
	}
	var in struct {
		Status string `json:"status"`
	}
	if err := c.Bind(&in); err != nil {
		return echo.ErrBadRequest
	}
	if !slices.Contains(stageStatuses, in.Status) {
		return invalid(c, http.StatusBadRequest, fieldErrors{"status": "Escolha pendente, em andamento ou concluída."})
	}
	res, err := s.db.ExecContext(c.Request().Context(), `UPDATE stages SET status = ? WHERE id = ? AND project_id = ?`, in.Status, id, p.ID)
	if err != nil {
		return err
	}
	if err := requireAffected(res); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
