package api_test

import (
	"net/http"
	"testing"
)

func TestExecutionDBRejectsStatusAndFilesUnlessSigned(t *testing.T) {
	e, db := newServerDB(t)
	a := signedUp(t, e)
	path := filledProject(t, e, a)
	const setStatus = `UPDATE stages SET status = 'in_progress'`
	const addFile = `INSERT INTO stage_files (stage_id, key, name, content_type, size) SELECT id, 'k' || id, 'a.pdf', 'application/pdf', 1 FROM stages`

	for _, q := range []string{setStatus, addFile} {
		if _, err := db.ExecContext(t.Context(), q); err == nil {
			t.Errorf("%s succeeded on unsigned project", q)
		}
	}
	if rec := send(e, http.MethodPost, path+"/contract", nil, a); rec.Code != http.StatusCreated {
		t.Fatalf("finalize = %d", rec.Code)
	}
	for _, q := range []string{setStatus, addFile} {
		if _, err := db.ExecContext(t.Context(), q); err == nil {
			t.Errorf("%s succeeded on final project", q)
		}
	}
	if _, err := db.ExecContext(t.Context(), `UPDATE projects SET status = 'signed'`); err != nil {
		t.Fatalf("mark signed: %v", err)
	}
	for _, q := range []string{setStatus, addFile} {
		if _, err := db.ExecContext(t.Context(), q); err != nil {
			t.Errorf("%s on signed project: %v", q, err)
		}
	}
}
