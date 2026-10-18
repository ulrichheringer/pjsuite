package api

import (
	"net/http"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/labstack/echo/v5"
)

const (
	maxProjectNameRunes = 120
	maxReferenceRunes   = 40
	projectSelect       = `SELECT p.id, p.client_id, c.name, p.name, p.area, p.reference, p.goal, p.structure, p.status, p.archived_at IS NOT NULL
		FROM projects p JOIN clients c ON c.id = p.client_id`
)

var projectStructures = []string{"blank", "essential", "suggested"}

type project struct {
	ID         int64  `json:"id"`
	ClientID   int64  `json:"clientId"`
	ClientName string `json:"clientName"`
	Name       string `json:"name"`
	Area       string `json:"area"`
	Reference  string `json:"reference"`
	Goal       string `json:"goal"`
	Structure  string `json:"structure"`
	Status     string `json:"status"`
	Archived   bool   `json:"archived"`
}

func (p *project) scan(row interface{ Scan(...any) error }) error {
	return row.Scan(&p.ID, &p.ClientID, &p.ClientName, &p.Name, &p.Area, &p.Reference, &p.Goal, &p.Structure, &p.Status, &p.Archived)
}

func (p *project) normalize() {
	p.Name = strings.TrimSpace(p.Name)
	p.Reference = strings.TrimSpace(p.Reference)
	p.Goal = strings.TrimSpace(p.Goal)
	if p.Structure == "" {
		p.Structure = "essential"
	}
}

func (p project) validate() fieldErrors {
	errs := fieldErrors{}
	if p.Name == "" || utf8.RuneCountInString(p.Name) > maxProjectNameRunes {
		errs["name"] = "Informe o nome do projeto (até 120 caracteres)."
	}
	if p.Area != "" && !slices.Contains(areas, p.Area) {
		errs["area"] = "Escolha uma área de atuação."
	}
	if utf8.RuneCountInString(p.Reference) > maxReferenceRunes {
		errs["reference"] = "Use até 40 caracteres."
	}
	if !slices.Contains(projectStructures, p.Structure) {
		errs["structure"] = "Escolha uma estrutura."
	}
	return errs
}

func (s *server) activeClientExists(c *echo.Context, id int64) (bool, error) {
	var ok bool
	err := s.db.QueryRowContext(c.Request().Context(),
		`SELECT EXISTS (SELECT 1 FROM clients WHERE id = ? AND user_id = ? AND archived_at IS NULL)`, id, userIDOf(c)).Scan(&ok)
	return ok, err
}

func (s *server) createProject(c *echo.Context) error {
	var p project
	if err := c.Bind(&p); err != nil {
		return echo.ErrBadRequest
	}
	p.normalize()
	errs := p.validate()
	ok, err := s.activeClientExists(c, p.ClientID)
	if err != nil {
		return err
	}
	if !ok {
		errs["client"] = "Escolha um cliente ativo."
	}
	if len(errs) > 0 {
		return invalid(c, http.StatusBadRequest, errs)
	}
	err = s.db.QueryRowContext(c.Request().Context(),
		`INSERT INTO projects (user_id, client_id, name, area, reference, goal, structure) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
		userIDOf(c), p.ClientID, p.Name, p.Area, p.Reference, p.Goal, p.Structure).Scan(&p.ID)
	if err != nil {
		return err
	}
	if err := p.scan(s.db.QueryRowContext(c.Request().Context(), projectSelect+` WHERE p.id = ?`, p.ID)); err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, p)
}

func (s *server) listProjects(c *echo.Context) error {
	rows, err := s.db.QueryContext(c.Request().Context(),
		projectSelect+` WHERE p.user_id = ? AND (p.archived_at IS NOT NULL) = ? ORDER BY p.created_at DESC, p.id DESC`,
		userIDOf(c), c.QueryParam("archived") == "1")
	if err != nil {
		return err
	}
	defer rows.Close()
	projects := []project{}
	for rows.Next() {
		var p project
		if err := p.scan(rows); err != nil {
			return err
		}
		projects = append(projects, p)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, projects)
}
