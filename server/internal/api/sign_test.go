package api_test

import (
	"net/http"
	"testing"
)

func TestSignDBRejectsChangesToVersionsAndSignatures(t *testing.T) {
	e, db := newServerDB(t)
	a := signedUp(t, e)
	path := filledProject(t, e, a)
	if rec := send(e, http.MethodPost, path+"/contract", nil, a); rec.Code != http.StatusCreated {
		t.Fatalf("finalize = %d", rec.Code)
	}
	if _, err := db.ExecContext(t.Context(),
		`INSERT INTO signatures (project_id, version, name, email, ip, user_agent, hash) SELECT project_id, number, 'Ana', 'ana@example.com', '1.1.1.1', 'ua', hash FROM contract_versions`); err != nil {
		t.Fatalf("insert signature: %v", err)
	}

	for _, q := range []string{
		`UPDATE contract_versions SET note = 'x'`,
		`DELETE FROM contract_versions`,
		`UPDATE signatures SET name = 'x'`,
		`DELETE FROM signatures`,
	} {
		if _, err := db.ExecContext(t.Context(), q); err == nil {
			t.Errorf("%s succeeded", q)
		}
	}
	if _, err := db.ExecContext(t.Context(), `DELETE FROM projects`); err != nil {
		t.Fatalf("project delete cascade: %v", err)
	}
	var left int
	if err := db.QueryRowContext(t.Context(), `SELECT (SELECT COUNT(*) FROM contract_versions) + (SELECT COUNT(*) FROM signatures)`).Scan(&left); err != nil || left != 0 {
		t.Fatalf("left = %d err = %v", left, err)
	}
}
