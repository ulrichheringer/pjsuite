package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/labstack/echo/v5"
)

type portalView struct {
	Version int             `json:"version"`
	Status  string          `json:"status"`
	Content json.RawMessage `json:"content"`
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
		return tx.QueryRowContext(ctx,
			`SELECT v.number, v.content, p.status FROM contract_versions v JOIN projects p ON p.id = v.project_id
			WHERE v.project_id = ? ORDER BY v.number DESC LIMIT 1`, projectID).Scan(&view.Version, &content, &view.Status)
	})
	if errors.Is(err, sql.ErrNoRows) {
		return linkInvalid(c)
	}
	if err != nil {
		return err
	}
	view.Content = json.RawMessage(content)
	return c.JSON(http.StatusOK, view)
}
