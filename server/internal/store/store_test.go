package store_test

import (
	"path/filepath"
	"testing"

	"github.com/pressly/goose/v3"

	"github.com/ulrichheringer/pjsuite/server/internal/store"
	"github.com/ulrichheringer/pjsuite/server/migrations"
)

func TestContractMigrationKeepsProjectData(t *testing.T) {
	db, err := store.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("sqlite3"); err != nil {
		t.Fatal(err)
	}
	if err := goose.UpToContext(t.Context(), db, ".", 8); err != nil {
		t.Fatal(err)
	}
	for _, q := range []string{
		`INSERT INTO users (id, email, password_hash, name) VALUES (1, 'a@example.com', 'x', 'A')`,
		`INSERT INTO clients (id, user_id, name) VALUES (1, 1, 'Ana')`,
		`INSERT INTO projects (id, user_id, client_id, name, scope, price_cents) VALUES (1, 1, 1, 'Ensaio', 'Escopo', 500)`,
		`INSERT INTO stages (project_id, position, name, timing_kind) VALUES (1, 1, 'Etapa', 'none')`,
		`INSERT INTO payments (project_id, position, kind, percent, trigger) VALUES (1, 1, 'unico', 100, 'assinatura')`,
	} {
		if _, err := db.ExecContext(t.Context(), q); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	if err := store.Migrate(t.Context(), db); err != nil {
		t.Fatal(err)
	}

	var scope string
	var cents, stages, payments int
	err = db.QueryRowContext(t.Context(),
		`SELECT scope, price_cents, (SELECT COUNT(*) FROM stages), (SELECT COUNT(*) FROM payments) FROM projects WHERE id = 1`).Scan(&scope, &cents, &stages, &payments)
	if err != nil {
		t.Fatal(err)
	}
	if scope != "Escopo" || cents != 500 || stages != 1 || payments != 1 {
		t.Fatalf("after migrate: scope=%q cents=%d stages=%d payments=%d", scope, cents, stages, payments)
	}
	if _, err := db.ExecContext(t.Context(), `UPDATE projects SET status = 'final' WHERE id = 1`); err != nil {
		t.Fatalf("status final rejected: %v", err)
	}
	var fk int
	if err := db.QueryRowContext(t.Context(), `PRAGMA foreign_keys`).Scan(&fk); err != nil || fk != 1 {
		t.Fatalf("foreign_keys = %d, %v", fk, err)
	}
}
