package api

import (
	"database/sql"
	"net/http"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

const maxJSONBytes = 1 << 20

type server struct{ db *sql.DB }

func New(db *sql.DB) *echo.Echo {
	s := &server{db: db}
	e := echo.New()
	e.Use(middleware.Recover())
	e.Use(middleware.RequestLogger())

	g := e.Group("/api")
	g.GET("/health", func(c *echo.Context) error {
		if err := db.PingContext(c.Request().Context()); err != nil {
			return c.JSON(http.StatusServiceUnavailable, map[string]string{"status": "db unavailable"})
		}
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})
	bodyLimit := middleware.BodyLimit(maxJSONBytes)
	g.POST("/signup", s.signup, bodyLimit)
	g.POST("/login", s.login, bodyLimit)
	g.POST("/logout", s.logout)
	g.GET("/me", s.me, s.requireAuth)
	g.GET("/profile", s.getProfile, s.requireAuth)
	g.PUT("/profile", s.putProfile, s.requireAuth, bodyLimit)
	g.PUT("/profile/avatar", s.putAvatar, s.requireAuth)
	g.GET("/profile/avatar", s.getAvatar, s.requireAuth)
	g.GET("/clients", s.listClients, s.requireAuth)
	g.POST("/clients", s.createClient, s.requireAuth, bodyLimit)
	g.GET("/clients/:id", s.getClient, s.requireAuth)
	g.PUT("/clients/:id", s.putClient, s.requireAuth, bodyLimit)
	g.PUT("/clients/:id/stage", s.putClientStage, s.requireAuth, bodyLimit)
	g.POST("/clients/:id/archive", s.archiveClient, s.requireAuth)
	g.POST("/clients/:id/restore", s.restoreClient, s.requireAuth)
	g.GET("/projects", s.listProjects, s.requireAuth)
	g.POST("/projects", s.createProject, s.requireAuth, bodyLimit)
	g.GET("/projects/:id", s.getProject, s.requireAuth)
	g.PUT("/projects/:id", s.putProject, s.requireAuth, bodyLimit)
	g.POST("/projects/:id/archive", s.archiveProject, s.requireAuth)
	g.POST("/projects/:id/duplicate", s.duplicateProject, s.requireAuth, bodyLimit)
	g.GET("/projects/:id/stages", s.listStages, s.requireAuth)
	g.POST("/projects/:id/stages", s.writableProject(s.createStage), s.requireAuth, bodyLimit)
	g.PUT("/projects/:id/stages/order", s.writableProject(s.putStageOrder), s.requireAuth, bodyLimit)
	g.PUT("/projects/:id/stages/:sid", s.writableProject(s.putStage), s.requireAuth, bodyLimit)
	g.DELETE("/projects/:id/stages/:sid", s.writableProject(s.deleteStage), s.requireAuth)
	return e
}
