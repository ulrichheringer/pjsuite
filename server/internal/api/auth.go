package api

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	"golang.org/x/crypto/bcrypt"
	"modernc.org/sqlite"
)

const (
	sessionCookie = "pjsuite_session"
	sessionTTL    = 30 * 24 * time.Hour
	sqliteUnique  = 2067
)

type fieldErrors map[string]string

func invalid(c *echo.Context, status int, errs fieldErrors) error {
	return c.JSON(status, map[string]any{"errors": errs})
}

type signupRequest struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	AcceptTerms bool   `json:"acceptTerms"`
}

func (r signupRequest) validate() fieldErrors {
	errs := fieldErrors{}
	if r.Name == "" {
		errs["name"] = "Informe seu nome."
	}
	if !strings.Contains(r.Email, "@") {
		errs["email"] = "Confira seu e-mail."
	}
	if len(r.Password) < 8 {
		errs["password"] = "Confira a senha. Use pelo menos 8 caracteres."
	}
	if !r.AcceptTerms {
		errs["acceptTerms"] = "Aceite os termos para continuar."
	}
	return errs
}

func (s *server) signup(c *echo.Context) error {
	var req signupRequest
	if err := c.Bind(&req); err != nil {
		return echo.ErrBadRequest
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.TrimSpace(req.Email)
	if errs := req.validate(); len(errs) > 0 {
		return invalid(c, http.StatusBadRequest, errs)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	ctx := c.Request().Context()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	res, err := tx.ExecContext(ctx,
		`INSERT INTO users (email, name, password_hash, terms_accepted_at) VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
		req.Email, req.Name, string(hash))
	var sqlErr *sqlite.Error
	if errors.As(err, &sqlErr) && sqlErr.Code() == sqliteUnique {
		return invalid(c, http.StatusConflict, fieldErrors{"email": "E-mail já cadastrado"})
	}
	if err != nil {
		return err
	}
	userID, err := res.LastInsertId()
	if err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO profiles (user_id, name, contact_email) VALUES (?, ?, ?)`,
		userID, req.Name, req.Email); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	if err := s.startSession(c, userID); err != nil {
		return err
	}
	return c.NoContent(http.StatusCreated)
}

func (s *server) startSession(c *echo.Context, userID int64) error {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return err
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	expires := time.Now().Add(sessionTTL)
	if _, err := s.db.ExecContext(c.Request().Context(),
		`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`,
		hashToken(token), userID, expires.UTC().Format("2006-01-02T15:04:05.000Z")); err != nil {
		return err
	}
	c.SetCookie(&http.Cookie{
		Name:     sessionCookie,
		Value:    token,
		Path:     "/",
		Expires:  expires,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	return nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

