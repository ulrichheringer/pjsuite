package api

import (
	"context"
	"database/sql"
	"net/http"

	"github.com/labstack/echo/v5"
)

type eventKind string

const (
	eventProjectCreated    eventKind = "project_created"
	eventContractFinalized eventKind = "contract_finalized"
	eventVersionShared     eventKind = "version_shared"
	eventClientViewed      eventKind = "client_viewed"
	eventChangeRequested   eventKind = "change_requested"
	eventRefused           eventKind = "refused"
	eventRevisionCreated   eventKind = "revision_created"
	eventSigned            eventKind = "signed"
	eventDeliveryPublished eventKind = "delivery_published"
	eventAdjustRequested   eventKind = "adjust_requested"
	eventApproved          eventKind = "approved"
	eventCompleted         eventKind = "completed"
	eventArchived          eventKind = "archived"
)

type event struct {
	Kind    eventKind
	Client  bool
	Private bool
	Name    string
	Number  int
	Message string
}

func (ev event) shared() bool {
	if ev.Private {
		return false
	}
	switch ev.Kind {
	case eventProjectCreated, eventContractFinalized, eventArchived:
		return false
	}
	return true
}

func (ev event) actor() string {
	if ev.Client {
		return "client"
	}
	return "pro"
}

func recordEvent(ctx context.Context, tx *sql.Tx, projectID int64, ev event) error {
	_, err := tx.ExecContext(ctx,
		`INSERT INTO project_events (project_id, kind, actor, actor_name, number, message, shared)
		SELECT p.id, ?, ?,
			COALESCE(NULLIF(?, ''), CASE ? WHEN 'client' THEN c.name ELSE (SELECT name FROM profiles WHERE user_id = p.user_id) END),
			?, ?, ?
		FROM projects p JOIN clients c ON c.id = p.client_id WHERE p.id = ?`,
		ev.Kind, ev.actor(), ev.Name, ev.actor(), ev.Number, ev.Message, ev.shared(), projectID)
	return err
}

type eventView struct {
	ID        int64     `json:"id"`
	Kind      eventKind `json:"kind"`
	Actor     string    `json:"actor"`
	ActorName string    `json:"actorName"`
	Number    int       `json:"number"`
	Message   string    `json:"message"`
	Shared    bool      `json:"shared"`
	CreatedAt string    `json:"createdAt"`
}

func (s *server) listProjectEvents(c *echo.Context) error {
	p, err := s.findProject(c)
	if err != nil {
		return err
	}
	rows, err := s.db.QueryContext(c.Request().Context(),
		`SELECT id, kind, actor, actor_name, number, message, shared, created_at FROM project_events WHERE project_id = ? ORDER BY id DESC`, p.ID)
	if err != nil {
		return err
	}
	defer rows.Close()
	list := []eventView{}
	for rows.Next() {
		var ev eventView
		if err := rows.Scan(&ev.ID, &ev.Kind, &ev.Actor, &ev.ActorName, &ev.Number, &ev.Message, &ev.Shared, &ev.CreatedAt); err != nil {
			return err
		}
		list = append(list, ev)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, list)
}

type portalEvent struct {
	Kind      eventKind `json:"kind"`
	Actor     string    `json:"actor"`
	ActorName string    `json:"actorName"`
	Number    int       `json:"number"`
	Message   string    `json:"message"`
	CreatedAt string    `json:"createdAt"`
}

func (s *server) listPortalEvents(c *echo.Context) error {
	ctx := c.Request().Context()
	rows, err := s.db.QueryContext(ctx,
		`SELECT e.kind, e.actor, e.actor_name, e.number, e.message, e.created_at
		FROM project_events e JOIN share_links l ON l.project_id = e.project_id JOIN projects p ON p.id = e.project_id
		WHERE l.token = ? AND p.archived_at IS NULL AND e.shared = 1 ORDER BY e.id DESC`, c.Param("token"))
	if err != nil {
		return err
	}
	defer rows.Close()
	list := []portalEvent{}
	for rows.Next() {
		var ev portalEvent
		if err := rows.Scan(&ev.Kind, &ev.Actor, &ev.ActorName, &ev.Number, &ev.Message, &ev.CreatedAt); err != nil {
			return err
		}
		list = append(list, ev)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if len(list) == 0 {
		var valid bool
		err := s.db.QueryRowContext(ctx,
			`SELECT EXISTS (SELECT 1 FROM share_links l JOIN projects p ON p.id = l.project_id WHERE l.token = ? AND p.archived_at IS NULL)`,
			c.Param("token")).Scan(&valid)
		if err != nil {
			return err
		}
		if !valid {
			return linkInvalid(c)
		}
	}
	return c.JSON(http.StatusOK, list)
}
