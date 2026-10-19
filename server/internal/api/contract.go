package api

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v5"
)

type contractVersion struct {
	Number    int             `json:"number"`
	Hash      string          `json:"hash"`
	CreatedAt string          `json:"createdAt"`
	Content   json.RawMessage `json:"content"`
}

func (s *server) finalizeContract(c *echo.Context, p project) error {
	view, err := s.buildClientView(c.Request().Context(), userIDOf(c), p)
	if err != nil {
		return err
	}
	content, err := json.Marshal(view)
	if err != nil {
		return err
	}
	sum := sha256.Sum256(content)
	version := contractVersion{Number: 1, Hash: hex.EncodeToString(sum[:]), Content: content}
	err = s.inTx(c, func(ctx context.Context, tx *sql.Tx) error {
		var exists bool
		if err := tx.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM contract_versions WHERE project_id = ?)`, p.ID).Scan(&exists); err != nil {
			return err
		}
		if exists {
			return invalid(c, http.StatusConflict, fieldErrors{"contract": "O contrato já foi finalizado."})
		}
		err := tx.QueryRowContext(ctx,
			`INSERT INTO contract_versions (project_id, number, content, hash) VALUES (?, ?, ?, ?) RETURNING created_at`,
			p.ID, version.Number, string(content), version.Hash).Scan(&version.CreatedAt)
		if err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `UPDATE projects SET status = 'final' WHERE id = ?`, p.ID)
		return err
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, version)
}

func (s *server) getContract(c *echo.Context) error {
	p, err := s.findProject(c)
	if err != nil {
		return err
	}
	number, err := strconv.Atoi(c.Param("n"))
	if err != nil {
		return echo.ErrNotFound
	}
	var content string
	v := contractVersion{Number: number}
	err = s.db.QueryRowContext(c.Request().Context(),
		`SELECT hash, created_at, content FROM contract_versions WHERE project_id = ? AND number = ?`, p.ID, number).Scan(&v.Hash, &v.CreatedAt, &content)
	if errors.Is(err, sql.ErrNoRows) {
		return echo.ErrNotFound
	}
	if err != nil {
		return err
	}
	v.Content = json.RawMessage(content)
	return c.JSON(http.StatusOK, v)
}
