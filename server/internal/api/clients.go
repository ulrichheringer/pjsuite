package api

import (
	"database/sql"
	"errors"
	"net/http"
	"net/mail"
	"slices"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/labstack/echo/v5"
)

const (
	maxClientNameRunes = 120
	clientColumns      = `id, name, email, phone, company, notes, stage, archived_at IS NOT NULL`
)

var clientStages = []string{"recent", "proposal", "active"}

type client struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Company  string `json:"company"`
	Notes    string `json:"notes"`
	Stage    string `json:"stage"`
	Archived bool   `json:"archived"`
}

func (cl *client) scan(row interface{ Scan(...any) error }) error {
	return row.Scan(&cl.ID, &cl.Name, &cl.Email, &cl.Phone, &cl.Company, &cl.Notes, &cl.Stage, &cl.Archived)
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
	err := cl.scan(s.db.QueryRowContext(c.Request().Context(),
		`INSERT INTO clients (user_id, name, email, phone, company, notes) VALUES (?, ?, ?, ?, ?, ?) RETURNING `+clientColumns,
		userIDOf(c), cl.Name, cl.Email, cl.Phone, cl.Company, cl.Notes))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, cl)
}

func (s *server) listClients(c *echo.Context) error {
	rows, err := s.db.QueryContext(c.Request().Context(),
		`SELECT `+clientColumns+` FROM clients WHERE user_id = ? AND (archived_at IS NOT NULL) = ? ORDER BY name COLLATE NOCASE`,
		userIDOf(c), c.QueryParam("archived") == "1")
	if err != nil {
		return err
	}
	defer rows.Close()
	clients := []client{}
	for rows.Next() {
		var cl client
		if err := cl.scan(rows); err != nil {
			return err
		}
		clients = append(clients, cl)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, clients)
}

func (s *server) findClient(c *echo.Context) (client, error) {
	var cl client
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return cl, echo.ErrNotFound
	}
	err = cl.scan(s.db.QueryRowContext(c.Request().Context(),
		`SELECT `+clientColumns+` FROM clients WHERE id = ? AND user_id = ?`, id, userIDOf(c)))
	if errors.Is(err, sql.ErrNoRows) {
		return cl, echo.ErrNotFound
	}
	return cl, err
}

func (s *server) findActiveClient(c *echo.Context) (client, error) {
	cl, err := s.findClient(c)
	if err == nil && cl.Archived {
		return cl, echo.NewHTTPError(http.StatusConflict, "Cliente arquivado.")
	}
	return cl, err
}

func (s *server) getClient(c *echo.Context) error {
	cl, err := s.findClient(c)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, cl)
}

func (s *server) putClient(c *echo.Context) error {
	cl, err := s.findActiveClient(c)
	if err != nil {
		return err
	}
	id := cl.ID
	cl = client{}
	if err := c.Bind(&cl); err != nil {
		return echo.ErrBadRequest
	}
	cl.normalize()
	if errs := cl.validate(); len(errs) > 0 {
		return invalid(c, http.StatusBadRequest, errs)
	}
	if _, err := s.db.ExecContext(c.Request().Context(),
		`UPDATE clients SET name = ?, email = ?, phone = ?, company = ?, notes = ? WHERE id = ?`,
		cl.Name, cl.Email, cl.Phone, cl.Company, cl.Notes, id); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (s *server) putClientStage(c *echo.Context) error {
	cl, err := s.findActiveClient(c)
	if err != nil {
		return err
	}
	var req struct {
		Stage string `json:"stage"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.ErrBadRequest
	}
	if !slices.Contains(clientStages, req.Stage) {
		return invalid(c, http.StatusBadRequest, fieldErrors{"stage": "Escolha uma etapa."})
	}
	if _, err := s.db.ExecContext(c.Request().Context(), `UPDATE clients SET stage = ? WHERE id = ?`, req.Stage, cl.ID); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (s *server) archiveClient(c *echo.Context) error {
	return s.setArchived(c, `COALESCE(archived_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
}

func (s *server) restoreClient(c *echo.Context) error {
	return s.setArchived(c, `NULL`)
}

func (s *server) setArchived(c *echo.Context, value string) error {
	cl, err := s.findClient(c)
	if err != nil {
		return err
	}
	if _, err := s.db.ExecContext(c.Request().Context(), `UPDATE clients SET archived_at = `+value+` WHERE id = ?`, cl.ID); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
