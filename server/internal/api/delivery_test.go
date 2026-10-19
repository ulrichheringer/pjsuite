package api_test

import (
	"net/http"
	"testing"
)

func TestDeliveryDBRejectsDraftsUnlessSignedAndFreezesPublished(t *testing.T) {
	e, db := newServerDB(t)
	a := signedUp(t, e)
	path := filledProject(t, e, a)
	const addDraft = `INSERT INTO deliveries (project_id) SELECT id FROM projects`
	const addFile = `INSERT INTO delivery_files (delivery_id, key, name, content_type, size) SELECT id, 'k' || id, 'a.pdf', 'application/pdf', 1 FROM deliveries`
	exec := func(q string) error {
		_, err := db.ExecContext(t.Context(), q)
		return err
	}

	if exec(addDraft) == nil {
		t.Fatal("draft accepted on unsigned project")
	}
	if rec := send(e, http.MethodPost, path+"/contract", nil, a); rec.Code != http.StatusCreated {
		t.Fatalf("finalize = %d", rec.Code)
	}
	if exec(addDraft) == nil {
		t.Fatal("draft accepted on final project")
	}
	if err := exec(`UPDATE projects SET status = 'signed'`); err != nil {
		t.Fatalf("mark signed: %v", err)
	}
	if err := exec(addDraft); err != nil {
		t.Fatalf("draft on signed project: %v", err)
	}
	if err := exec(addFile); err != nil {
		t.Fatalf("file in draft: %v", err)
	}
	if err := exec(`UPDATE deliveries SET title = 'Entrega'`); err != nil {
		t.Fatalf("edit draft: %v", err)
	}
	if err := exec(`UPDATE deliveries SET number = 1, published_at = '2026-01-01T00:00:00Z'`); err != nil {
		t.Fatalf("publish: %v", err)
	}
	for _, q := range []string{
		`UPDATE deliveries SET title = 'Outro'`,
		`DELETE FROM deliveries`,
		`UPDATE delivery_files SET name = 'b.pdf'`,
		`DELETE FROM delivery_files`,
		addFile,
	} {
		if exec(q) == nil {
			t.Errorf("%s succeeded on published delivery", q)
		}
	}
}
