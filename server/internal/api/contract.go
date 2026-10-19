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
	"strings"
	"unicode/utf8"

	"github.com/labstack/echo/v5"
)

var (
	errContractFinalized = errors.New("contract already finalized")
	errRevisionClosed    = errors.New("revision not allowed")
)

type contractVersion struct {
	Number    int             `json:"number"`
	Hash      string          `json:"hash"`
	Note      string          `json:"note"`
	CreatedAt string          `json:"createdAt"`
	Content   json.RawMessage `json:"content"`
}

func (s *server) snapshot(c *echo.Context, p project) (contractVersion, error) {
	view, err := s.buildClientView(c.Request().Context(), userIDOf(c), p)
	if err != nil {
		return contractVersion{}, err
	}
	content, err := json.Marshal(view)
	if err != nil {
		return contractVersion{}, err
	}
	sum := sha256.Sum256(content)
	return contractVersion{Hash: hex.EncodeToString(sum[:]), Content: content}, nil
}

func (s *server) finalizeContract(c *echo.Context, p project) error {
	version, err := s.snapshot(c, p)
	if err != nil {
		return err
	}
	err = s.inTx(c, func(ctx context.Context, tx *sql.Tx) error {
		var exists bool
		if err := tx.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM contract_versions WHERE project_id = ?)`, p.ID).Scan(&exists); err != nil {
			return err
		}
		if exists {
			return errContractFinalized
		}
		err := tx.QueryRowContext(ctx,
			`INSERT INTO contract_versions (project_id, number, content, hash) VALUES (?, 1, ?, ?) RETURNING number, created_at`,
			p.ID, string(version.Content), version.Hash).Scan(&version.Number, &version.CreatedAt)
		if err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `UPDATE projects SET status = 'final' WHERE id = ?`, p.ID)
		return err
	})
	if errors.Is(err, errContractFinalized) {
		return invalid(c, http.StatusConflict, fieldErrors{"contract": "O contrato já foi finalizado."})
	}
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, version)
}

func (s *server) reviseContract(c *echo.Context, p project) error {
	var in struct {
		Note string `json:"note"`
	}
	if err := c.Bind(&in); err != nil {
		return echo.ErrBadRequest
	}
	note := strings.TrimSpace(in.Note)
	if note == "" || utf8.RuneCountInString(note) > maxRequestRunes {
		return invalid(c, http.StatusBadRequest, fieldErrors{"note": "Descreva o que mudou (até 4000 caracteres)."})
	}
	version, err := s.snapshot(c, p)
	if err != nil {
		return err
	}
	version.Note = note
	err = s.inTx(c, func(ctx context.Context, tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx,
			`UPDATE projects SET status = 'sent' WHERE id = ? AND status IN ('final', 'sent', 'viewed', 'changes_requested')`, p.ID)
		if err != nil {
			return err
		}
		if n, err := res.RowsAffected(); err != nil {
			return err
		} else if n == 0 {
			return errRevisionClosed
		}
		return tx.QueryRowContext(ctx,
			`INSERT INTO contract_versions (project_id, number, content, hash, note)
			VALUES (?, (SELECT MAX(number) + 1 FROM contract_versions WHERE project_id = ?), ?, ?, ?) RETURNING number, created_at`,
			p.ID, p.ID, string(version.Content), version.Hash, note).Scan(&version.Number, &version.CreatedAt)
	})
	if errors.Is(err, errRevisionClosed) {
		return invalid(c, http.StatusConflict, fieldErrors{"status": "Este contrato não aceita nova versão."})
	}
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
		`SELECT hash, note, created_at, content FROM contract_versions WHERE project_id = ? AND number = ?`, p.ID, number).Scan(&v.Hash, &v.Note, &v.CreatedAt, &content)
	if errors.Is(err, sql.ErrNoRows) {
		return echo.ErrNotFound
	}
	if err != nil {
		return err
	}
	v.Content = json.RawMessage(content)
	return c.JSON(http.StatusOK, v)
}

type versionSummary struct {
	Number    int    `json:"number"`
	Hash      string `json:"hash"`
	Note      string `json:"note"`
	CreatedAt string `json:"createdAt"`
}

func (s *server) listContract(c *echo.Context) error {
	p, err := s.findProject(c)
	if err != nil {
		return err
	}
	ctx := c.Request().Context()
	rows, err := s.db.QueryContext(ctx,
		`SELECT number, hash, note, created_at FROM contract_versions WHERE project_id = ? ORDER BY number DESC`, p.ID)
	if err != nil {
		return err
	}
	defer rows.Close()
	list := struct {
		Versions  []versionSummary `json:"versions"`
		Signature *receipt         `json:"signature"`
	}{Versions: []versionSummary{}}
	for rows.Next() {
		var v versionSummary
		if err := rows.Scan(&v.Number, &v.Hash, &v.Note, &v.CreatedAt); err != nil {
			return err
		}
		list.Versions = append(list.Versions, v)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if list.Signature, err = loadReceipt(ctx, s.db, p.ID); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, list)
}
