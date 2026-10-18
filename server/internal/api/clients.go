package api

import (
	"net/http"
	"net/mail"
	"strings"
	"unicode/utf8"

	"github.com/labstack/echo/v5"
)

const maxClientNameRunes = 120

type client struct {
	ID      int64  `json:"id"`
	Name    string `json:"name"`
	Email   string `json:"email"`
	Phone   string `json:"phone"`
	Company string `json:"company"`
	Notes   string `json:"notes"`
	Stage   string `json:"stage"`
}

func (cl *client) normalize() {
	cl.Name = strings.TrimSpace(cl.Name)
	cl.Email = strings.TrimSpace(cl.Email)
	cl.Phone = strings.TrimSpace(cl.Phone)
	cl.Company = strings.TrimSpace(cl.Company)
}

func (cl client) validate() fieldErrors {
	errs := fieldErrors{}
	if cl.Name == "" || utf8.RuneCountInString(cl.Name) > maxClientNameRunes {
		errs["name"] = "Informe o nome do cliente (até 120 caracteres)."
	}
	if addr, err := mail.ParseAddress(cl.Email); cl.Email != "" && (err != nil || addr.Address != cl.Email) {
		errs["email"] = "Confira o e-mail."
	}
	return errs
}

func (s *server) createClient(c *echo.Context) error {
	var cl client
	if err := c.Bind(&cl); err != nil {
		return echo.ErrBadRequest
	}
	cl.normalize()
	if errs := cl.validate(); len(errs) > 0 {
		return invalid(c, http.StatusBadRequest, errs)
	}
	err := s.db.QueryRowContext(c.Request().Context(),
		`INSERT INTO clients (user_id, name, email, phone, company, notes) VALUES (?, ?, ?, ?, ?, ?) RETURNING id, stage`,
		userIDOf(c), cl.Name, cl.Email, cl.Phone, cl.Company, cl.Notes).Scan(&cl.ID, &cl.Stage)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, cl)
}

func (s *server) listClients(c *echo.Context) error {
	rows, err := s.db.QueryContext(c.Request().Context(),
		`SELECT id, name, email, phone, company, notes, stage FROM clients WHERE user_id = ? AND archived_at IS NULL ORDER BY name COLLATE NOCASE`,
		userIDOf(c))
	if err != nil {
		return err
	}
	defer rows.Close()
	clients := []client{}
	for rows.Next() {
		var cl client
		if err := rows.Scan(&cl.ID, &cl.Name, &cl.Email, &cl.Phone, &cl.Company, &cl.Notes, &cl.Stage); err != nil {
			return err
		}
		clients = append(clients, cl)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, clients)
}
