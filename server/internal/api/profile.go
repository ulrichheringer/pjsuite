package api

import (
	"database/sql"
	"errors"
	"io"
	"net/http"
	"slices"
	"strings"

	"github.com/labstack/echo/v5"
)

var areas = []string{"Fotografia", "Design", "Produção", "Outros serviços criativos"}

type profile struct {
	Name         string `json:"name"`
	BusinessName string `json:"businessName"`
	ContactEmail string `json:"contactEmail"`
	Phone        string `json:"phone"`
	Area         string `json:"area"`
	City         string `json:"city"`
	Bio          string `json:"bio"`
	HasAvatar    bool   `json:"hasAvatar"`
}

func (p profile) validate() fieldErrors {
	errs := fieldErrors{}
	if p.Name == "" {
		errs["name"] = "Informe seu nome profissional."
	}
	if !strings.Contains(p.ContactEmail, "@") {
		errs["contactEmail"] = "Confira seu e-mail."
	}
	if p.Area != "" && !slices.Contains(areas, p.Area) {
		errs["area"] = "Escolha uma área de atuação."
	}
	return errs
}

func (s *server) getProfile(c *echo.Context) error {
	var p profile
	err := s.db.QueryRowContext(c.Request().Context(),
		`SELECT name, business_name, contact_email, phone, area, city, bio, avatar IS NOT NULL FROM profiles WHERE user_id = ?`,
		userIDOf(c)).Scan(&p.Name, &p.BusinessName, &p.ContactEmail, &p.Phone, &p.Area, &p.City, &p.Bio, &p.HasAvatar)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, p)
}

func (s *server) putProfile(c *echo.Context) error {
	var p profile
	if err := c.Bind(&p); err != nil {
		return echo.ErrBadRequest
	}
	p.Name = strings.TrimSpace(p.Name)
	p.ContactEmail = strings.TrimSpace(p.ContactEmail)
	if errs := p.validate(); len(errs) > 0 {
		return invalid(c, http.StatusBadRequest, errs)
	}
	if _, err := s.db.ExecContext(c.Request().Context(),
		`UPDATE profiles SET name = ?, business_name = ?, contact_email = ?, phone = ?, area = ?, city = ?, bio = ? WHERE user_id = ?`,
		p.Name, p.BusinessName, p.ContactEmail, p.Phone, p.Area, p.City, p.Bio, userIDOf(c)); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

const maxAvatarBytes = 2 << 20

var avatarTypes = []string{"image/png", "image/jpeg", "image/webp"}

func (s *server) putAvatar(c *echo.Context) error {
	data, err := io.ReadAll(http.MaxBytesReader(c.Response(), c.Request().Body, maxAvatarBytes))
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		return echo.ErrStatusRequestEntityTooLarge
	}
	if err != nil {
		return echo.ErrBadRequest
	}
	contentType := http.DetectContentType(data)
	if !slices.Contains(avatarTypes, contentType) {
		return echo.ErrUnsupportedMediaType
	}
	if _, err := s.db.ExecContext(c.Request().Context(),
		`UPDATE profiles SET avatar = ?, avatar_type = ? WHERE user_id = ?`, data, contentType, userIDOf(c)); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (s *server) getAvatar(c *echo.Context) error {
	var (
		data        []byte
		contentType string
	)
	err := s.db.QueryRowContext(c.Request().Context(),
		`SELECT avatar, avatar_type FROM profiles WHERE user_id = ? AND avatar IS NOT NULL`, userIDOf(c)).Scan(&data, &contentType)
	if errors.Is(err, sql.ErrNoRows) {
		return echo.ErrNotFound
	}
	if err != nil {
		return err
	}
	c.Response().Header().Set("Cache-Control", "no-cache")
	return c.Blob(http.StatusOK, contentType, data)
}
