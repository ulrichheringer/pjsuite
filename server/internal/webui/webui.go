package webui

import (
	"embed"
	"io/fs"
	"strings"

	"github.com/labstack/echo/v5"
)

const (
	immutable = "public, max-age=31536000, immutable"
	noCache   = "no-cache"
)

//go:embed all:dist
var embedded embed.FS

func Files() fs.FS {
	files, err := fs.Sub(embedded, "dist")
	if err != nil {
		panic(err)
	}
	return files
}

func Handler(files fs.FS) echo.HandlerFunc {
	return func(c *echo.Context) error {
		name := strings.TrimPrefix(c.Request().URL.Path, "/")
		cache := noCache
		if strings.HasPrefix(name, "assets/") {
			cache = immutable
		}
		if info, err := fs.Stat(files, name); err == nil && !info.IsDir() {
			c.Response().Header().Set("Cache-Control", cache)
			return c.FileFS(name, files)
		}
		if cache == immutable || strings.HasPrefix(name, "api/") {
			return echo.ErrNotFound
		}
		c.Response().Header().Set("Cache-Control", noCache)
		return c.FileFS("index.html", files)
	}
}
