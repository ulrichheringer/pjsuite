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
		if p.Completed {
			return invalid(c, http.StatusConflict, fieldErrors{"completed": "Projeto concluído."})
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
		var sid int64
		var f attachment
		if err := rows.Scan(&sid, &f.ID, &f.Name, &f.ContentType, &f.Size, &f.CreatedAt); err != nil {
			return nil, err
		}
		files[sid] = append(files[sid], f)
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

func (s *server) requireStage(c *echo.Context, p project) (int64, error) {
	id, err := stageID(c)
	if err != nil {
		return 0, err
	}
	var found int64
	err = s.db.QueryRowContext(c.Request().Context(), `SELECT id FROM stages WHERE id = ? AND project_id = ?`, id, p.ID).Scan(&found)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, echo.ErrNotFound
	}
	return found, err
}

func (s *server) uploadStageFile(c *echo.Context, p project) error {
	id, err := s.requireStage(c, p)
	if err != nil {
		return err
	}
	var f attachment
	err = s.saveUpload(c, func(ctx context.Context, u storedUpload) error {
		f = attachment{Name: u.Name, ContentType: u.ContentType, Size: u.Size}
		return s.db.QueryRowContext(ctx,
			`INSERT INTO stage_files (stage_id, key, name, content_type, size) VALUES (?, ?, ?, ?, ?) RETURNING id, created_at`,
			id, u.Key, u.Name, u.ContentType, u.Size).Scan(&f.ID, &f.CreatedAt)
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, f)
}

func (s *server) listStageFiles(c *echo.Context) error {
	p, err := s.findProject(c)
	if err != nil {
		return err
	}
	id, err := s.requireStage(c, p)
	if err != nil {
		return err
	}
	rows, err := s.db.QueryContext(c.Request().Context(),
		`SELECT id, name, content_type, size, created_at FROM stage_files WHERE stage_id = ? ORDER BY id`, id)
	if err != nil {
		return err
	}
	defer rows.Close()
	list := []attachment{}
	for rows.Next() {
		var f attachment
		if err := rows.Scan(&f.ID, &f.Name, &f.ContentType, &f.Size, &f.CreatedAt); err != nil {
			return err
		}
		list = append(list, f)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, list)
}

func (s *server) findStageFile(c *echo.Context, p project) (f attachment, key string, err error) {
	sid, err := s.requireStage(c, p)
	if err != nil {
		return f, "", err
	}
	id, err := strconv.ParseInt(c.Param("fid"), 10, 64)
	if err != nil {
		return f, "", echo.ErrNotFound
	}
	err = s.db.QueryRowContext(c.Request().Context(),
		`SELECT id, key, name, content_type, size, created_at FROM stage_files WHERE id = ? AND stage_id = ?`, id, sid).
		Scan(&f.ID, &key, &f.Name, &f.ContentType, &f.Size, &f.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return f, "", echo.ErrNotFound
	}
	return f, key, err
}

func (s *server) downloadStageFile(c *echo.Context) error {
	p, err := s.findProject(c)
	if err != nil {
		return err
	}
	f, key, err := s.findStageFile(c, p)
	if err != nil {
		return err
	}
	return s.streamObject(c, key, f)
}

func (s *server) deleteStageFile(c *echo.Context, p project) error {
	f, key, err := s.findStageFile(c, p)
	if err != nil {
		return err
	}
	ctx := c.Request().Context()
	if _, err := s.db.ExecContext(ctx, `DELETE FROM stage_files WHERE id = ?`, f.ID); err != nil {
		return err
	}
	s.dropObject(ctx, key)
	return c.NoContent(http.StatusNoContent)
}
