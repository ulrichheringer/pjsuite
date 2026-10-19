package api_test

import (
	"net/http"
	"strings"
	"testing"
)

type contractJSON struct {
	Number    int            `json:"number"`
	Hash      string         `json:"hash"`
	CreatedAt string         `json:"createdAt"`
	Content   map[string]any `json:"content"`
}

func TestContractFinalizeCreatesV1AndMarksProjectFinal(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := filledProject(t, e, a)

	rec := send(e, http.MethodPost, path+"/contract", nil, a)
	if rec.Code != http.StatusCreated {
		t.Fatalf("POST = %d %s", rec.Code, rec.Body)
	}
	var created contractJSON
	decode(t, rec, &created)
	if created.Number != 1 || len(created.Hash) != 64 || created.CreatedAt == "" {
		t.Fatalf("created = %+v", created)
	}
	body := rec.Body.String()
	for _, want := range []string{"Ensaio", "Helena", "Ana", "Retratos em estúdio", "Etapa Aberta", "150000", "briefing.pdf"} {
		if !strings.Contains(body, want) {
			t.Errorf("snapshot missing %q in %s", want, body)
		}
	}
	for _, secret := range []string{"NOTA-SECRETA", "TAREFA-SECRETA", "Etapa Oculta", "ENTREGA-OCULTA"} {
		if strings.Contains(body, secret) {
			t.Errorf("snapshot leaked %q", secret)
		}
	}

	var got map[string]any
	decode(t, get(e, path, a), &got)
	if got["status"] != "final" {
		t.Fatalf("status = %v", got["status"])
	}

	second := send(e, http.MethodPost, path+"/contract", nil, a)
	if second.Code != http.StatusConflict {
		t.Fatalf("second POST = %d", second.Code)
	}
	var conflict struct {
		Errors map[string]string `json:"errors"`
	}
	decode(t, second, &conflict)
	if conflict.Errors["contract"] == "" {
		t.Fatalf("second POST body = %s", second.Body)
	}
	if rec := get(e, path+"/contract/2", a); rec.Code != http.StatusNotFound {
		t.Fatalf("second version = %d", rec.Code)
	}
}

func TestContractSnapshotIgnoresLaterEdits(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := filledProject(t, e, a)
	if rec := send(e, http.MethodPost, path+"/contract", nil, a); rec.Code != http.StatusCreated {
		t.Fatalf("POST = %d", rec.Code)
	}
	first := get(e, path+"/contract/1", a)
	if first.Code != http.StatusOK {
		t.Fatalf("GET = %d %s", first.Code, first.Body)
	}

	edits := []struct {
		method, suffix string
		body           any
	}{
		{http.MethodPut, "/builder", map[string]any{"scope": "Escopo novo", "outcome": "Outro", "notes": "x"}},
		{http.MethodPut, "/payments", map[string]any{"priceCents": 1, "payments": []map[string]any{}}},
		{http.MethodPut, "/visibility", map[string]bool{"scope": false}},
	}
	for _, s := range edits {
		if rec := send(e, s.method, path+s.suffix, s.body, a); rec.Code >= 300 {
			t.Fatalf("%s %s = %d", s.method, s.suffix, rec.Code)
		}
	}

	again := get(e, path+"/contract/1", a)
	if again.Code != http.StatusOK || again.Body.String() != first.Body.String() {
		t.Fatalf("snapshot changed:\n%s\n%s", first.Body, again.Body)
	}
	if strings.Contains(again.Body.String(), "Escopo novo") {
		t.Fatal("snapshot shows live data")
	}
}

func TestContractAccessAndState(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	b := signedUpAs(t, e, "bruno@example.com")
	path := filledProject(t, e, a)

	if rec := get(e, path+"/contract/1", a); rec.Code != http.StatusNotFound {
		t.Errorf("before finalize = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, path+"/contract", nil, b); rec.Code != http.StatusNotFound {
		t.Errorf("other user POST = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, path+"/contract", nil, a); rec.Code != http.StatusCreated {
		t.Fatalf("POST = %d", rec.Code)
	}
	if rec := get(e, path+"/contract/1", b); rec.Code != http.StatusNotFound {
		t.Errorf("other user GET = %d", rec.Code)
	}
	for _, n := range []string{"2", "0", "x"} {
		if rec := get(e, path+"/contract/"+n, a); rec.Code != http.StatusNotFound {
			t.Errorf("version %s = %d", n, rec.Code)
		}
	}

	archived := filledProject(t, e, a)
	if rec := send(e, http.MethodPost, archived+"/archive", nil, a); rec.Code != http.StatusNoContent {
		t.Fatalf("archive = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, archived+"/contract", nil, a); rec.Code != http.StatusConflict {
		t.Errorf("archived POST = %d", rec.Code)
	}
}

func TestContractKeepsProjectEditable(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := filledProject(t, e, a)
	if rec := send(e, http.MethodPost, path+"/contract", nil, a); rec.Code != http.StatusCreated {
		t.Fatalf("POST = %d", rec.Code)
	}
	if rec := send(e, http.MethodPut, path+"/builder", map[string]any{"scope": "Ajustado"}, a); rec.Code != http.StatusNoContent {
		t.Fatalf("edit after finalize = %d", rec.Code)
	}
}
