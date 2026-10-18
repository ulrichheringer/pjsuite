package api

import (
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
