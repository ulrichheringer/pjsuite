package api

import (
	"context"
	"database/sql"
	"net/http"
	"slices"

	"github.com/labstack/echo/v5"
)

var visibilityBlocks = []string{"scope", "stages", "deliverables", "price", "attachments"}

func (s *server) loadVisibility(ctx context.Context, projectID int64) (map[string]bool, error) {
	visible := map[string]bool{}
	for _, block := range visibilityBlocks {
		visible[block] = true
	}
	rows, err := s.db.QueryContext(ctx, `SELECT block, visible FROM project_blocks WHERE project_id = ?`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var block string
		var on bool
		if err := rows.Scan(&block, &on); err != nil {
			return nil, err
		}
		visible[block] = on
	}
	return visible, rows.Err()
}

func (s *server) getVisibility(c *echo.Context) error {
	p, err := s.findProject(c)
	if err != nil {
		return err
	}
	visible, err := s.loadVisibility(c.Request().Context(), p.ID)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, visible)
}

func (s *server) putVisibility(c *echo.Context, p project) error {
	var in map[string]bool
	if err := c.Bind(&in); err != nil {
		return echo.ErrBadRequest
	}
	for block := range in {
		if !slices.Contains(visibilityBlocks, block) {
			return invalid(c, http.StatusBadRequest, fieldErrors{"block": "Bloco desconhecido: " + block + "."})
		}
	}
	err := s.inTx(c, func(ctx context.Context, tx *sql.Tx) error {
		for block, on := range in {
			if _, err := tx.ExecContext(ctx,
				`INSERT INTO project_blocks (project_id, block, visible) VALUES (?, ?, ?)
				ON CONFLICT (project_id, block) DO UPDATE SET visible = excluded.visible`, p.ID, block, on); err != nil {
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
