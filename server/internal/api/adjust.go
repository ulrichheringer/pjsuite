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
	if _, err := s.respond(c, "adjust", message); err != nil {
		return s.responseFailure(c, err)
	}
	return c.NoContent(http.StatusNoContent)
}

type approvalReceipt struct {
	ApprovedAt string `json:"approvedAt"`
	Number     int    `json:"number"`
	Title      string `json:"title"`
}

func (s *server) postApprove(c *echo.Context) error {
	var in struct {
		Confirm bool `json:"confirm"`
	}
	if err := c.Bind(&in); err != nil {
		return echo.ErrBadRequest
	}
	if !in.Confirm {
		return invalid(c, http.StatusBadRequest, fieldErrors{"confirm": "Confirme a aprovação."})
	}
	r, err := s.respond(c, "approve", "")
	if err != nil {
		return s.responseFailure(c, err)
	}
	return c.JSON(http.StatusOK, r)
}

var errResponseClosed = errors.New("delivery no longer accepts responses")

func (s *server) responseFailure(c *echo.Context, err error) error {
	if errors.Is(err, errResponseClosed) {
		return invalid(c, http.StatusConflict, fieldErrors{"delivery": "Esta entrega não aceita mais respostas."})
	}
	if errors.Is(err, sql.ErrNoRows) {
		return linkInvalid(c)
	}
	return err
}

func (s *server) respond(c *echo.Context, kind, message string) (approvalReceipt, error) {
	var r approvalReceipt
	number, err := strconv.Atoi(c.Param("n"))
	if err != nil {
		return r, echo.ErrNotFound
	}
	r.Number = number
	err = s.inTx(c, func(ctx context.Context, tx *sql.Tx) error {
		var projectID int64
		err := tx.QueryRowContext(ctx,
			`SELECT l.project_id FROM share_links l JOIN projects p ON p.id = l.project_id WHERE l.token = ? AND p.archived_at IS NULL`,
			c.Param("token")).Scan(&projectID)
		if err != nil {
			return err
		}
		err = tx.QueryRowContext(ctx,
			`INSERT INTO delivery_responses (delivery_id, kind, message)
			SELECT d.id, ?, ? FROM deliveries d JOIN projects p ON p.id = d.project_id
			WHERE d.project_id = ? AND d.number = ? AND p.status = 'signed' AND p.completed_at IS NULL
			AND d.number = (SELECT MAX(number) FROM deliveries WHERE project_id = d.project_id)
			ON CONFLICT DO NOTHING RETURNING created_at`, kind, message, projectID, number).Scan(&r.ApprovedAt)
		if err == nil {
			return tx.QueryRowContext(ctx, `SELECT title FROM deliveries WHERE project_id = ? AND number = ?`, projectID, number).Scan(&r.Title)
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return err
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
	return r, err
}
