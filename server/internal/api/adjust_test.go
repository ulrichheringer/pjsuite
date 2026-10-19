package api_test

import (
	"strings"
	"testing"
)

func TestAdjustDBRestrictsResponsesAndFreezesCompleted(t *testing.T) {
	e, db := newServerDB(t)
	a := signedUp(t, e)
	filledProject(t, e, a)
	exec := func(q string) error {
		_, err := db.ExecContext(t.Context(), q)
		return err
	}
	const addDraft = `INSERT INTO deliveries (project_id) SELECT id FROM projects`
	const addFile = `INSERT INTO delivery_files (delivery_id, key, name, content_type, size) SELECT id, 'k' || id, 'a.pdf', 'application/pdf', 1 FROM deliveries WHERE published_at IS NULL`
	const publish = `UPDATE deliveries SET number = (SELECT COALESCE(MAX(number), 0) + 1 FROM deliveries), published_at = '2026-01-01T00:00:00Z' WHERE published_at IS NULL`
	const respond = `INSERT INTO delivery_responses (delivery_id, kind, message) SELECT id, 'adjust', 'Ajuste pedido' FROM deliveries WHERE number = (SELECT MAX(number) FROM deliveries)`
	const approveFirst = `INSERT INTO delivery_responses (delivery_id, kind, message) SELECT id, 'approve', '' FROM deliveries WHERE number = 1`

	if err := exec(`UPDATE projects SET status = 'signed'`); err != nil {
		t.Fatalf("mark signed: %v", err)
	}
	if err := exec(addDraft); err != nil {
		t.Fatalf("draft: %v", err)
	}
	if exec(`INSERT INTO delivery_responses (delivery_id, kind, message) SELECT id, 'adjust', 'x' FROM deliveries`) == nil {
		t.Fatal("response accepted on a draft")
	}
	for _, q := range []string{addFile, publish} {
		if err := exec(q); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	if err := exec(respond); err != nil {
		t.Fatalf("response on latest: %v", err)
	}
	if exec(respond) == nil {
		t.Error("second response accepted for one delivery")
	}
	for _, q := range []string{`UPDATE delivery_responses SET message = 'x'`, `DELETE FROM delivery_responses`} {
		if exec(q) == nil {
			t.Errorf("%s succeeded", q)
		}
	}
	for _, q := range []string{addDraft, addFile, publish, addDraft, addFile} {
		if err := exec(q); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	if exec(approveFirst) == nil {
		t.Error("response accepted on a superseded delivery")
	}
	if err := exec(`UPDATE projects SET completed_at = '2026-02-01T00:00:00Z'`); err != nil {
		t.Fatalf("complete: %v", err)
	}
	if exec(`UPDATE projects SET completed_at = NULL`) == nil {
		t.Error("completion reverted")
	}
	for _, q := range []string{
		`UPDATE stages SET status = 'in_progress'`,
		`INSERT INTO stage_files (stage_id, key, name, content_type, size) SELECT id, 'k' || id, 'a.pdf', 'application/pdf', 1 FROM stages`,
		addDraft,
		addFile,
		`DELETE FROM delivery_files WHERE delivery_id IN (SELECT id FROM deliveries WHERE published_at IS NULL)`,
		publish,
		`INSERT INTO delivery_responses (delivery_id, kind, message) SELECT id, 'approve', '' FROM deliveries WHERE number = 2`,
	} {
		if err := exec(q); err == nil || !strings.Contains(err.Error(), "completed") {
			t.Errorf("%s on completed project: %v", q, err)
		}
	}
}
