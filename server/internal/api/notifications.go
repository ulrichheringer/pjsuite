package api

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v5"
)

const ownClientEvents = `actor = 'client' AND project_id IN (SELECT id FROM projects WHERE user_id = ?)`

type notification struct {
	ID          int64     `json:"id"`
	ProjectID   int64     `json:"projectId"`
	ProjectName string    `json:"projectName"`
	Kind        eventKind `json:"kind"`
	ActorName   string    `json:"actorName"`
	Number      int       `json:"number"`
	Message     string    `json:"message"`
	CreatedAt   string    `json:"createdAt"`
	Read        bool      `json:"read"`
}

func (s *server) listNotifications(c *echo.Context) error {
	ctx := c.Request().Context()
	rows, err := s.db.QueryContext(ctx,
		`SELECT e.id, e.project_id, p.name, e.kind, e.actor_name, e.number, e.message, e.created_at, e.read_at IS NOT NULL
		FROM project_events e JOIN projects p ON p.id = e.project_id
		WHERE e.actor = 'client' AND p.user_id = ? ORDER BY e.id DESC`, userIDOf(c))
	if err != nil {
		return err
	}
	defer rows.Close()
	out := struct {
		Unread int            `json:"unread"`
		Items  []notification `json:"items"`
	}{Items: []notification{}}
	for rows.Next() {
		var n notification
		if err := rows.Scan(&n.ID, &n.ProjectID, &n.ProjectName, &n.Kind, &n.ActorName, &n.Number, &n.Message, &n.CreatedAt, &n.Read); err != nil {
			return err
		}
		if !n.Read {
			out.Unread++
		}
		out.Items = append(out.Items, n)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, out)
}

const markRead = `UPDATE project_events SET read_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE read_at IS NULL AND ` + ownClientEvents

func (s *server) readNotification(c *echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return echo.ErrNotFound
	}
	ctx := c.Request().Context()
	var owned bool
	err = s.db.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM project_events WHERE id = ? AND `+ownClientEvents+`)`, id, userIDOf(c)).Scan(&owned)
	if err != nil {
		return err
	}
	if !owned {
		return echo.ErrNotFound
	}
	if _, err := s.db.ExecContext(ctx, markRead+` AND id = ?`, userIDOf(c), id); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func (s *server) readAllNotifications(c *echo.Context) error {
	if _, err := s.db.ExecContext(c.Request().Context(), markRead, userIDOf(c)); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
