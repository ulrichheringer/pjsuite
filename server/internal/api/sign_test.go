package api_test

import (
	"net/http"
	"strings"
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

func TestSignRevisionPublishesNextVersionOnSameLink(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, l := finalizedShare(t, e, a)
	if rec := send(e, http.MethodPost, "/api/portal/"+l.Token+"/change", map[string]string{"message": "Trocar prazo"}, nil); rec.Code != http.StatusNoContent {
		t.Fatalf("change = %d", rec.Code)
	}
	if rec := send(e, http.MethodPut, path+"/builder", map[string]any{"scope": "Escopo revisado"}, a); rec.Code != http.StatusNoContent {
		t.Fatalf("edit = %d", rec.Code)
	}
	v1 := get(e, path+"/contract/1", a).Body.String()

	for _, note := range []string{"", "   ", strings.Repeat("a", 4001)} {
		if rec := send(e, http.MethodPost, path+"/contract/revision", map[string]string{"note": note}, a); rec.Code != http.StatusBadRequest {
			t.Errorf("note of %d bytes = %d", len(note), rec.Code)
		}
	}
	rec := send(e, http.MethodPost, path+"/contract/revision", map[string]string{"note": "Prazo ajustado"}, a)
	if rec.Code != http.StatusCreated {
		t.Fatalf("revision = %d %s", rec.Code, rec.Body)
	}
	var v2 struct {
		contractJSON
		Note string `json:"note"`
	}
	decode(t, rec, &v2)
	if v2.Number != 2 || v2.Note != "Prazo ajustado" || len(v2.Hash) != 64 || !strings.Contains(rec.Body.String(), "Escopo revisado") {
		t.Fatalf("v2 = %s", rec.Body)
	}
	if got := get(e, path+"/contract/1", a).Body.String(); got != v1 {
		t.Fatal("v1 changed")
	}
	var p map[string]any
	decode(t, get(e, path, a), &p)
	if p["status"] != "sent" {
		t.Fatalf("status = %v", p["status"])
	}
	var again shareJSON
	decode(t, get(e, path+"/share", a), &again)
	if again.Token != l.Token {
		t.Fatal("link changed")
	}

	if rec := send(e, http.MethodPost, path+"/contract/revision", map[string]string{"note": "x"}, signedUpAs(t, e, "bruno@example.com")); rec.Code != http.StatusNotFound {
		t.Errorf("other user = %d", rec.Code)
	}
}

func TestSignRevisionRejectsDraftAndRefused(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	draft := filledProject(t, e, a)
	if rec := send(e, http.MethodPost, draft+"/contract/revision", map[string]string{"note": "x"}, a); rec.Code != http.StatusConflict {
		t.Errorf("draft = %d", rec.Code)
	}
	path, l := finalizedShare(t, e, a)
	if rec := send(e, http.MethodPost, "/api/portal/"+l.Token+"/refuse", map[string]string{"reason": ""}, nil); rec.Code != http.StatusNoContent {
		t.Fatalf("refuse = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, path+"/contract/revision", map[string]string{"note": "x"}, a); rec.Code != http.StatusConflict {
		t.Errorf("refused = %d", rec.Code)
	}
}

func TestSignPortalServesLatestVersionAndRecordsChangeAgainstIt(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, l := finalizedShare(t, e, a)
	if rec := send(e, http.MethodPut, path+"/builder", map[string]any{"scope": "Escopo revisado"}, a); rec.Code != http.StatusNoContent {
		t.Fatalf("edit = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, path+"/contract/revision", map[string]string{"note": "Ajuste"}, a); rec.Code != http.StatusCreated {
		t.Fatalf("revision = %d", rec.Code)
	}
	rec := get(e, "/api/portal/"+l.Token)
	var view portalJSON
	decode(t, rec, &view)
	if view.Version != 2 || view.Status != "viewed" || !strings.Contains(rec.Body.String(), "Escopo revisado") {
		t.Fatalf("portal = %s", rec.Body)
	}
	if rec := send(e, http.MethodPost, "/api/portal/"+l.Token+"/change", map[string]string{"message": "Mais uma"}, nil); rec.Code != http.StatusNoContent {
		t.Fatalf("change = %d", rec.Code)
	}
	var share shareJSON
	decode(t, get(e, path+"/share", a), &share)
	if share.Request == nil || share.Request.Version != 2 {
		t.Fatalf("share = %+v", share)
	}
}
