package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/labstack/echo/v5"
)

const maxRequestRunes = 4000

var errRequestClosed = errors.New("contract no longer accepts requests")

type portalProgress struct {
	Name   string `json:"name"`
	Status string `json:"status"`
}

type portalFile struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Size int64  `json:"size"`
}

type portalDelivery struct {
	Number      int          `json:"number"`
	Title       string       `json:"title"`
	Message     string       `json:"message"`
	PublishedAt string       `json:"publishedAt"`
	Files       []portalFile `json:"files"`
}

type portalView struct {
	Version    int               `json:"version"`
	Status     string            `json:"status"`
	Content    json.RawMessage   `json:"content"`
	Signature  *receipt          `json:"signature"`
	Progress   *[]portalProgress `json:"progress,omitempty"`
	Deliveries *[]portalDelivery `json:"deliveries,omitempty"`
}

func linkInvalid(c *echo.Context) error {
	return c.JSON(http.StatusNotFound, map[string]string{"error": "link_invalid"})
}

func (s *server) getPortal(c *echo.Context) error {
	var projectID int64
	var view portalView
	var content string
	err := s.inTx(c, func(ctx context.Context, tx *sql.Tx) error {
		err := tx.QueryRowContext(ctx,
			`SELECT l.project_id FROM share_links l JOIN projects p ON p.id = l.project_id WHERE l.token = ? AND p.archived_at IS NULL`,
			c.Param("token")).Scan(&projectID)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx,
			`UPDATE share_links SET viewed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE project_id = ? AND viewed_at IS NULL`, projectID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `UPDATE projects SET status = 'viewed' WHERE id = ? AND status = 'sent'`, projectID); err != nil {
			return err
		}
		err = tx.QueryRowContext(ctx,
			`SELECT v.number, v.content, p.status FROM contract_versions v JOIN projects p ON p.id = v.project_id
			WHERE v.project_id = ? ORDER BY v.number DESC LIMIT 1`, projectID).Scan(&view.Version, &content, &view.Status)
		if err != nil {
			return err
		}
		view.Signature, err = loadReceipt(ctx, tx, projectID)
		return err
	})
	if errors.Is(err, sql.ErrNoRows) {
		return linkInvalid(c)
	}
	if err != nil {
		return err
	}
	view.Content = json.RawMessage(content)
	if view.Status == "signed" {
		ctx := c.Request().Context()
		if view.Progress, err = s.loadProgress(ctx, projectID); err != nil {
			return err
		}
		if view.Deliveries, err = s.loadPortalDeliveries(ctx, projectID); err != nil {
			return err
		}
	}
	return c.JSON(http.StatusOK, view)
}

func (s *server) loadProgress(ctx context.Context, projectID int64) (*[]portalProgress, error) {
	visible, err := s.loadVisibility(ctx, projectID)
	if err != nil || !visible["stages"] {
		return nil, err
	}
	list := []portalProgress{}
	stages, err := s.loadStages(ctx, projectID)
	if err != nil {
		return nil, err
	}
	for _, st := range stages {
		if st.Visible {
			list = append(list, portalProgress{Name: st.Name, Status: st.Status})
		}
	}
	return &list, nil
}

func (s *server) postChange(c *echo.Context) error {
	var in struct {
		Message string `json:"message"`
	}
	if err := c.Bind(&in); err != nil {
		return echo.ErrBadRequest
	}
	message := strings.TrimSpace(in.Message)
	if message == "" || utf8.RuneCountInString(message) > maxRequestRunes {
		return invalid(c, http.StatusBadRequest, fieldErrors{"message": "Descreva a alteração (até 4000 caracteres)."})
	}
	return s.recordRequest(c, "change", "changes_requested", message)
}

func (s *server) postRefuse(c *echo.Context) error {
	var in struct {
		Reason string `json:"reason"`
	}
	if err := c.Bind(&in); err != nil {
		return echo.ErrBadRequest
	}
	reason := strings.TrimSpace(in.Reason)
	if utf8.RuneCountInString(reason) > maxRequestRunes {
		return invalid(c, http.StatusBadRequest, fieldErrors{"reason": "Use até 4000 caracteres."})
	}
	return s.recordRequest(c, "refuse", "refused", reason)
}

func (s *server) recordRequest(c *echo.Context, kind, status, message string) error {
	err := s.inTx(c, func(ctx context.Context, tx *sql.Tx) error {
		var projectID int64
		err := tx.QueryRowContext(ctx,
			`SELECT p.id FROM share_links l JOIN projects p ON p.id = l.project_id WHERE l.token = ? AND p.archived_at IS NULL`,
			c.Param("token")).Scan(&projectID)
		if err != nil {
			return err
		}
		res, err := tx.ExecContext(ctx,
			`UPDATE projects SET status = ? WHERE id = ? AND status NOT IN ('refused', 'signed')`, status, projectID)
		if err != nil {
			return err
		}
		if n, err := res.RowsAffected(); err != nil {
			return err
		} else if n == 0 {
			return errRequestClosed
		}
		_, err = tx.ExecContext(ctx,
			`INSERT INTO client_requests (project_id, version, kind, message)
			VALUES (?, (SELECT MAX(number) FROM contract_versions WHERE project_id = ?), ?, ?)`,
			projectID, projectID, kind, message)
		return err
	})
	if errors.Is(err, sql.ErrNoRows) {
		return linkInvalid(c)
	}
	if errors.Is(err, errRequestClosed) {
		return invalid(c, http.StatusConflict, fieldErrors{"status": "O contrato já foi recusado ou assinado."})
	}
	if err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
