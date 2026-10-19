package api

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"net/http"

	"github.com/labstack/echo/v5"
)

var errNoContract = errors.New("no contract version")

type clientRequest struct {
	Kind      string `json:"kind"`
	Message   string `json:"message"`
	Version   int    `json:"version"`
	CreatedAt string `json:"createdAt"`
}

type shareLink struct {
	Token    string         `json:"token"`
	URL      string         `json:"url"`
	ViewedAt *string        `json:"viewedAt"`
	Request  *clientRequest `json:"request"`
}

func newToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

func (s *server) loadShare(ctx context.Context, projectID int64) (shareLink, error) {
	var l shareLink
	err := s.db.QueryRowContext(ctx, `SELECT token, viewed_at FROM share_links WHERE project_id = ?`, projectID).Scan(&l.Token, &l.ViewedAt)
	if err != nil {
		return l, err
	}
	l.URL = "/p/" + l.Token
	var r clientRequest
	err = s.db.QueryRowContext(ctx,
		`SELECT kind, message, version, created_at FROM client_requests WHERE project_id = ? ORDER BY id DESC LIMIT 1`, projectID).
		Scan(&r.Kind, &r.Message, &r.Version, &r.CreatedAt)
	if err == nil {
		l.Request = &r
	}
	if errors.Is(err, sql.ErrNoRows) {
		return l, nil
	}
	return l, err
}

const (
	keepShare    = `DO NOTHING`
	replaceShare = `DO UPDATE SET token = excluded.token, created_at = excluded.created_at, viewed_at = NULL`
)

func (s *server) createShare(c *echo.Context, p project) error {
	return s.writeShare(c, p, keepShare)
}

func (s *server) regenerateShare(c *echo.Context, p project) error {
	return s.writeShare(c, p, replaceShare)
}

func (s *server) writeShare(c *echo.Context, p project, onConflict string) error {
	token, err := newToken()
	if err != nil {
		return err
	}
	err = s.inTx(c, func(ctx context.Context, tx *sql.Tx) error {
		var latest int
		if err := tx.QueryRowContext(ctx, `SELECT COALESCE(MAX(number), 0) FROM contract_versions WHERE project_id = ?`, p.ID).Scan(&latest); err != nil {
			return err
		}
		if latest == 0 {
			return errNoContract
		}
		res, err := tx.ExecContext(ctx, `INSERT INTO share_links (project_id, token) VALUES (?, ?) ON CONFLICT (project_id) `+onConflict, p.ID, token)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `UPDATE projects SET status = 'sent' WHERE id = ? AND status = 'final'`, p.ID); err != nil {
			return err
		}
		if n, err := res.RowsAffected(); err != nil || n == 0 {
			return err
		}
		return recordEvent(ctx, tx, p.ID, event{Kind: eventVersionShared, Number: latest})
	})
	if errors.Is(err, errNoContract) {
		return invalid(c, http.StatusConflict, fieldErrors{"contract": "Finalize o contrato antes de compartilhar."})
	}
	if err != nil {
		return err
	}
	return s.respondShare(c, p.ID)
}

func (s *server) respondShare(c *echo.Context, projectID int64) error {
	l, err := s.loadShare(c.Request().Context(), projectID)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, l)
}

func (s *server) getShare(c *echo.Context) error {
	p, err := s.findProject(c)
	if err != nil {
		return err
	}
	l, err := s.loadShare(c.Request().Context(), p.ID)
	if errors.Is(err, sql.ErrNoRows) {
		return echo.ErrNotFound
	}
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, l)
}
