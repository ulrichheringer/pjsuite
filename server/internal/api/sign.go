package api

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"unicode/utf8"

	"github.com/labstack/echo/v5"
)

const (
	maxSignerNameRunes  = 120
	maxSignerEmailRunes = 254
)

var (
	errSignClosed   = errors.New("contract not signable")
	errStaleVersion = errors.New("stale contract version")
)

type receipt struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Version  int    `json:"version"`
	Hash     string `json:"hash"`
	SignedAt string `json:"signedAt"`
}

type signRequest struct {
	Version int    `json:"version"`
	Name    string `json:"name"`
	Email   string `json:"email"`
	Consent bool   `json:"consent"`
}

func (r signRequest) validate() fieldErrors {
	errs := fieldErrors{}
	if r.Name == "" || utf8.RuneCountInString(r.Name) > maxSignerNameRunes {
		errs["name"] = "Informe seu nome completo."
	}
	if addr, err := mail.ParseAddress(r.Email); err != nil || addr.Address != r.Email || utf8.RuneCountInString(r.Email) > maxSignerEmailRunes {
		errs["email"] = "Confira o e-mail."
	}
	if !r.Consent {
		errs["consent"] = "Confirme o aceite para assinar."
	}
	return errs
}

func (s *server) postSign(c *echo.Context) error {
	var in signRequest
	if err := c.Bind(&in); err != nil {
		return echo.ErrBadRequest
	}
	in.Name = strings.TrimSpace(in.Name)
	in.Email = strings.TrimSpace(in.Email)
	if errs := in.validate(); len(errs) > 0 {
		return invalid(c, http.StatusBadRequest, errs)
	}
	var r receipt
	err := s.inTx(c, func(ctx context.Context, tx *sql.Tx) error {
		var projectID int64
		var status string
		err := tx.QueryRowContext(ctx,
			`SELECT p.id, p.status FROM share_links l JOIN projects p ON p.id = l.project_id WHERE l.token = ? AND p.archived_at IS NULL`,
			c.Param("token")).Scan(&projectID, &status)
		if err != nil {
			return err
		}
		if status == "refused" || status == "signed" {
			return errSignClosed
		}
		var latest int
		if err := tx.QueryRowContext(ctx, `SELECT MAX(number) FROM contract_versions WHERE project_id = ?`, projectID).Scan(&latest); err != nil {
			return err
		}
		if in.Version != latest {
			return errStaleVersion
		}
		err = tx.QueryRowContext(ctx,
			`INSERT INTO signatures (project_id, version, name, email, ip, user_agent, hash)
			SELECT project_id, number, ?, ?, ?, ?, hash FROM contract_versions WHERE project_id = ? AND number = ?
			RETURNING name, email, version, hash, signed_at`,
			in.Name, in.Email, c.RealIP(), c.Request().UserAgent(), projectID, latest).Scan(&r.Name, &r.Email, &r.Version, &r.Hash, &r.SignedAt)
		if err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `UPDATE projects SET status = 'signed' WHERE id = ?`, projectID)
		return err
	})
	if errors.Is(err, sql.ErrNoRows) {
		return linkInvalid(c)
	}
	if errors.Is(err, errSignClosed) {
		return invalid(c, http.StatusConflict, fieldErrors{"status": "Este contrato não pode mais ser assinado."})
	}
	if errors.Is(err, errStaleVersion) {
		return c.JSON(http.StatusConflict, map[string]string{"error": "stale_version"})
	}
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, r)
}

type rowQuerier interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func loadReceipt(ctx context.Context, q rowQuerier, projectID int64) (*receipt, error) {
	var r receipt
	err := q.QueryRowContext(ctx, `SELECT name, email, version, hash, signed_at FROM signatures WHERE project_id = ?`, projectID).
		Scan(&r.Name, &r.Email, &r.Version, &r.Hash, &r.SignedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &r, nil
}
