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
	minAdjustRunes = 10
	maxAdjustRunes = 2000
)

func (s *server) postAdjust(c *echo.Context) error {
	var in struct {
		Message string `json:"message"`
	}
	if err := c.Bind(&in); err != nil {
		return echo.ErrBadRequest
	}
	message := strings.TrimSpace(in.Message)
	if n := utf8.RuneCountInString(message); n < minAdjustRunes || n > maxAdjustRunes {
		return invalid(c, http.StatusBadRequest, fieldErrors{"message": "Descreva o ajuste (de 10 a 2000 caracteres)."})
	}
	if err := s.respond(c, "adjust", message); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (s *server) respond(c *echo.Context, kind, message string) error {
	number, err := strconv.Atoi(c.Param("n"))
	if err != nil {
		return echo.ErrNotFound
	}
	err = s.inTx(c, func(ctx context.Context, tx *sql.Tx) error {
		var projectID int64
		err := tx.QueryRowContext(ctx,
			`SELECT l.project_id FROM share_links l JOIN projects p ON p.id = l.project_id WHERE l.token = ? AND p.archived_at IS NULL`,
			c.Param("token")).Scan(&projectID)
		if err != nil {
			return err
		}
		res, err := tx.ExecContext(ctx,
			`INSERT INTO delivery_responses (delivery_id, kind, message)
			SELECT d.id, ?, ? FROM deliveries d JOIN projects p ON p.id = d.project_id
			WHERE d.project_id = ? AND d.number = ? AND p.status = 'signed' AND p.completed_at IS NULL
			AND d.number = (SELECT MAX(number) FROM deliveries WHERE project_id = d.project_id)
			ON CONFLICT DO NOTHING`, kind, message, projectID, number)
		if err != nil {
			return err
		}
		if n, err := res.RowsAffected(); err != nil {
			return err
		} else if n > 0 {
			return nil
		}
		var exists bool
		if err := tx.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM deliveries WHERE project_id = ? AND number = ?)`, projectID, number).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			return echo.ErrNotFound
		}
		return errResponseClosed
	})
	if errors.Is(err, sql.ErrNoRows) {
		return linkInvalid(c)
	}
	if errors.Is(err, errResponseClosed) {
		return invalid(c, http.StatusConflict, fieldErrors{"delivery": "Esta entrega não aceita mais respostas."})
	}
	return err
}

var errResponseClosed = errors.New("delivery no longer accepts responses")
