package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/labstack/echo/v5"

	"github.com/ulrichheringer/pjsuite/server/internal/api"
	"github.com/ulrichheringer/pjsuite/server/internal/store"
)

func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "err", err)
		os.Exit(1)
	}
}

func run() error {
	db, err := store.Open(env("PJSUITE_DB", "pjsuite.db"))
	if err != nil {
		return err
	}
	defer db.Close()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	sc := echo.StartConfig{Address: env("PJSUITE_ADDR", ":8080")}
	return sc.Start(ctx, api.New(db))
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
