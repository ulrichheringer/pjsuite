package api

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
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

	maxPasswordBytes = 72
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
	if len(r.Password) < 8 || len(r.Password) > maxPasswordBytes {
		errs["password"] = "Confira a senha. Use de 8 a 72 caracteres."
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

const absentUserHash = "$2a$10$PTJTnhKCGWzkqphyDZLS/Oei67zXs5BpbMo5yERO4xsZW6jVLomZe"

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *server) login(c *echo.Context) error {
	var req loginRequest
	if err := c.Bind(&req); err != nil {
		return echo.ErrBadRequest
	}
	var (
		userID int64
		hash   string
	)
	err := s.db.QueryRowContext(c.Request().Context(),
		`SELECT id, password_hash FROM users WHERE email = ?`, strings.TrimSpace(req.Email)).Scan(&userID, &hash)
	if errors.Is(err, sql.ErrNoRows) {
		hash = absentUserHash
	} else if err != nil {
		return err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)) != nil || err != nil {
		return invalid(c, http.StatusUnauthorized, fieldErrors{"form": "E-mail ou senha incorretos."})
	}
	if err := s.startSession(c, userID); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (s *server) logout(c *echo.Context) error {
	if cookie, err := c.Cookie(sessionCookie); err == nil {
		if _, err := s.db.ExecContext(c.Request().Context(),
			`DELETE FROM sessions WHERE token_hash = ?`, hashToken(cookie.Value)); err != nil {
			return err
		}
	}
	c.SetCookie(&http.Cookie{Name: sessionCookie, Path: "/", MaxAge: -1, HttpOnly: true, SameSite: http.SameSiteLaxMode})
	return c.NoContent(http.StatusNoContent)
}

func (s *server) me(c *echo.Context) error {
	var user struct {
		ID    int64  `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	user.ID = userIDOf(c)
	err := s.db.QueryRowContext(c.Request().Context(),
		`SELECT email, name FROM users WHERE id = ?`, user.ID).Scan(&user.Email, &user.Name)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, user)
}

const userIDKey = "userID"

func userIDOf(c *echo.Context) int64 {
	id, _ := c.Get(userIDKey).(int64)
	return id
}

func (s *server) requireAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c *echo.Context) error {
		cookie, err := c.Cookie(sessionCookie)
		if err != nil {
			return echo.ErrUnauthorized
		}
		var userID int64
		err = s.db.QueryRowContext(c.Request().Context(),
			`SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
			hashToken(cookie.Value)).Scan(&userID)
		if errors.Is(err, sql.ErrNoRows) {
			return echo.ErrUnauthorized
		}
		if err != nil {
			return err
		}
		c.Set(userIDKey, userID)
		return next(c)
	}
}
