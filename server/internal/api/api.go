package api

import (
	"database/sql"
	"net/http"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

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
	g.POST("/signup", s.signup)
	return e
}
