package api

import (
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/labstack/echo/v5"
)

const (
	maxScopeRunes   = 2000
	maxOutcomeRunes = 1000
	maxNotesRunes   = 2000
)

type builderInput struct {
	Scope   string `json:"scope"`
	Outcome string `json:"outcome"`
	Notes   string `json:"notes"`
}

func (b builderInput) validate() fieldErrors {
	errs := fieldErrors{}
	if utf8.RuneCountInString(b.Scope) > maxScopeRunes {
		errs["scope"] = "Use até 2000 caracteres."
	}
	if utf8.RuneCountInString(b.Outcome) > maxOutcomeRunes {
		errs["outcome"] = "Use até 1000 caracteres."
	}
	if utf8.RuneCountInString(b.Notes) > maxNotesRunes {
		errs["notes"] = "Use até 2000 caracteres."
	}
	return errs
}

func (s *server) putBuilder(c *echo.Context, p project) error {
	var in builderInput
	if err := c.Bind(&in); err != nil {
		return echo.ErrBadRequest
	}
	in.Scope = strings.TrimSpace(in.Scope)
	in.Outcome = strings.TrimSpace(in.Outcome)
	in.Notes = strings.TrimSpace(in.Notes)
	if errs := in.validate(); len(errs) > 0 {
		return invalid(c, http.StatusBadRequest, errs)
	}
	if _, err := s.db.ExecContext(c.Request().Context(),
		`UPDATE projects SET scope = ?, outcome = ?, notes = ? WHERE id = ?`, in.Scope, in.Outcome, in.Notes, p.ID); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
