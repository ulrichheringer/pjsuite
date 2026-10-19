package api

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/labstack/echo/v5"
)

const (
	maxDeliveryTitleRunes   = 120
	maxDeliveryMessageRunes = 2000
)

type deliveryResponse struct {
	Kind      string `json:"kind"`
	Message   string `json:"message"`
	CreatedAt string `json:"createdAt"`
}

type delivery struct {
	Number      *int              `json:"number"`
	Title       string            `json:"title"`
	Message     string            `json:"message"`
	PublishedAt *string           `json:"publishedAt"`
	Response    *deliveryResponse `json:"response"`
	Files       []attachment      `json:"files"`
}

type deliveryList struct {
	Phase       string     `json:"phase"`
	CompletedAt *string    `json:"completedAt"`
	Draft       *delivery  `json:"draft"`
	Published   []delivery `json:"published"`
}

func (s *server) loadDeliveries(ctx context.Context, projectID int64) (deliveryList, error) {
	list := deliveryList{Phase: "executing", Published: []delivery{}}
	if err := s.db.QueryRowContext(ctx, `SELECT completed_at FROM projects WHERE id = ?`, projectID).Scan(&list.CompletedAt); err != nil {
		return list, err
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT d.id, d.number, d.title, d.message, d.published_at, r.kind, r.message, r.created_at, f.id, f.name, f.content_type, f.size, f.created_at
		FROM deliveries d LEFT JOIN delivery_responses r ON r.delivery_id = d.id LEFT JOIN delivery_files f ON f.delivery_id = d.id
		WHERE d.project_id = ? ORDER BY d.number DESC, f.id`, projectID)
	if err != nil {
		return list, err
	}
	defer rows.Close()
	var current *delivery
	var currentID int64
	for rows.Next() {
		var id int64
		var d delivery
		var fid, size sql.NullInt64
		var kind, responseMessage, responseAt, name, contentType, createdAt sql.NullString
		if err := rows.Scan(&id, &d.Number, &d.Title, &d.Message, &d.PublishedAt, &kind, &responseMessage, &responseAt, &fid, &name, &contentType, &size, &createdAt); err != nil {
			return list, err
		}
		if current == nil || id != currentID {
			d.Files = []attachment{}
			if kind.Valid {
				d.Response = &deliveryResponse{Kind: kind.String, Message: responseMessage.String, CreatedAt: responseAt.String}
			}
			if d.PublishedAt == nil {
				list.Draft = &d
				current = list.Draft
			} else {
				list.Published = append(list.Published, d)
				current = &list.Published[len(list.Published)-1]
			}
			currentID = id
		}
		if fid.Valid {
			current.Files = append(current.Files, attachment{ID: fid.Int64, Name: name.String, ContentType: contentType.String, Size: size.Int64, CreatedAt: createdAt.String})
		}
	}
	if err := rows.Err(); err != nil {
		return list, err
	}
	switch {
	case list.CompletedAt != nil:
		list.Phase = "completed"
	case len(list.Published) > 0 && list.Published[0].Response != nil && list.Published[0].Response.Kind == "adjust":
		list.Phase = "awaiting_adjustment"
	}
	return list, nil
}

func (s *server) listDeliveries(c *echo.Context) error {
	p, err := s.findProject(c)
	if err != nil {
		return err
	}
	list, err := s.loadDeliveries(c.Request().Context(), p.ID)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, list)
}

func (s *server) uploadDraftFile(c *echo.Context, p project) error {
	var f attachment
	err := s.saveUpload(c, func(ctx context.Context, u storedUpload) error {
		f = attachment{Name: u.Name, ContentType: u.ContentType, Size: u.Size}
		if _, err := s.db.ExecContext(ctx, `INSERT INTO deliveries (project_id) VALUES (?) ON CONFLICT DO NOTHING`, p.ID); err != nil {
			return err
		}
		return s.db.QueryRowContext(ctx,
			`INSERT INTO delivery_files (delivery_id, key, name, content_type, size)
			SELECT id, ?, ?, ?, ? FROM deliveries WHERE project_id = ? AND published_at IS NULL RETURNING id, created_at`,
			u.Key, u.Name, u.ContentType, u.Size, p.ID).Scan(&f.ID, &f.CreatedAt)
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, f)
}

func (s *server) deleteDraftFile(c *echo.Context, p project) error {
	id, err := strconv.ParseInt(c.Param("fid"), 10, 64)
	if err != nil {
		return echo.ErrNotFound
	}
	ctx := c.Request().Context()
	var key string
	err = s.db.QueryRowContext(ctx,
		`DELETE FROM delivery_files WHERE id = ? AND delivery_id IN (SELECT id FROM deliveries WHERE project_id = ? AND published_at IS NULL) RETURNING key`,
		id, p.ID).Scan(&key)
	if errors.Is(err, sql.ErrNoRows) {
		return echo.ErrNotFound
	}
	if err != nil {
		return err
	}
	s.dropObject(ctx, key)
	return c.NoContent(http.StatusNoContent)
}

func (s *server) publishDraft(c *echo.Context, p project) error {
	var in struct {
		Title   string `json:"title"`
		Message string `json:"message"`
	}
	if err := c.Bind(&in); err != nil {
		return echo.ErrBadRequest
	}
	title, message := strings.TrimSpace(in.Title), strings.TrimSpace(in.Message)
	errs := fieldErrors{}
	if title == "" || utf8.RuneCountInString(title) > maxDeliveryTitleRunes {
		errs["title"] = "Informe o título (até 120 caracteres)."
	}
	if utf8.RuneCountInString(message) > maxDeliveryMessageRunes {
		errs["message"] = "Use até 2000 caracteres."
	}
	if len(errs) > 0 {
		return invalid(c, http.StatusBadRequest, errs)
	}
	res, err := s.db.ExecContext(c.Request().Context(),
		`UPDATE deliveries SET title = ?, message = ?,
		number = (SELECT COALESCE(MAX(number), 0) + 1 FROM deliveries WHERE project_id = ?),
		published_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
		WHERE project_id = ? AND published_at IS NULL AND EXISTS (SELECT 1 FROM delivery_files WHERE delivery_id = deliveries.id)`,
		title, message, p.ID, p.ID)
	if err != nil {
		return err
	}
	if n, err := res.RowsAffected(); err != nil {
		return err
	} else if n == 0 {
		return invalid(c, http.StatusBadRequest, fieldErrors{"files": "Anexe ao menos um arquivo."})
	}
	return c.NoContent(http.StatusNoContent)
}

func (s *server) loadPortalDeliveries(ctx context.Context, projectID int64) (*[]portalDelivery, error) {
	stored, err := s.loadDeliveries(ctx, projectID)
	if err != nil {
		return nil, err
	}
	list := make([]portalDelivery, len(stored.Published))
	for i, d := range stored.Published {
		list[i] = portalDelivery{Number: *d.Number, Title: d.Title, Message: d.Message, PublishedAt: *d.PublishedAt, Response: d.Response, Files: make([]portalFile, len(d.Files))}
		for j, f := range d.Files {
			list[i].Files[j] = portalFile{ID: f.ID, Name: f.Name, Size: f.Size}
		}
	}
	return &list, nil
}

func (s *server) downloadPortalFile(c *echo.Context) error {
	number, err := strconv.Atoi(c.Param("n"))
	if err != nil {
		return echo.ErrNotFound
	}
	fid, err := strconv.ParseInt(c.Param("fid"), 10, 64)
	if err != nil {
		return echo.ErrNotFound
	}
	ctx := c.Request().Context()
	var projectID int64
	err = s.db.QueryRowContext(ctx,
		`SELECT l.project_id FROM share_links l JOIN projects p ON p.id = l.project_id WHERE l.token = ? AND p.archived_at IS NULL`,
		c.Param("token")).Scan(&projectID)
	if errors.Is(err, sql.ErrNoRows) {
		return linkInvalid(c)
	}
	if err != nil {
		return err
	}
	var f attachment
	var key string
	err = s.db.QueryRowContext(ctx,
		`SELECT f.id, f.key, f.name, f.content_type, f.size, f.created_at FROM delivery_files f JOIN deliveries d ON d.id = f.delivery_id
		WHERE f.id = ? AND d.project_id = ? AND d.number = ? AND d.published_at IS NOT NULL`, fid, projectID, number).
		Scan(&f.ID, &key, &f.Name, &f.ContentType, &f.Size, &f.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return echo.ErrNotFound
	}
	if err != nil {
		return err
	}
	return s.streamObject(c, key, f)
}
