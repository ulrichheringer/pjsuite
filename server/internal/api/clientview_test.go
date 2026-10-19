package api_test

import (
	"net/http"
	"strings"
	"testing"

	"github.com/labstack/echo/v5"
)

func filledProject(t *testing.T, e *echo.Echo, a *http.Cookie) string {
	t.Helper()
	path := blankProject(t, e, a)
	steps := []struct {
		method, suffix string
		body           any
	}{
		{http.MethodPut, "/builder", map[string]any{"scope": "Retratos em estúdio", "outcome": "Galeria publicada", "notes": "NOTA-SECRETA"}},
		{http.MethodPost, "/stages", map[string]any{"name": "Etapa Aberta", "timingKind": "deadline", "timing": "Até 05 out", "deliverable": "Briefing aprovado", "visible": true, "tasks": []string{"TAREFA-SECRETA"}}},
		{http.MethodPost, "/stages", map[string]any{"name": "Etapa Oculta", "timingKind": "none", "deliverable": "ENTREGA-OCULTA", "visible": false, "tasks": []string{"TAREFA-OCULTA"}}},
		{http.MethodPut, "/payments", map[string]any{"priceCents": 150000, "payments": []map[string]any{pay("unico", 100, "assinatura", "Na assinatura")}}},
	}
	for _, s := range steps {
		if rec := send(e, s.method, path+s.suffix, s.body, a); rec.Code >= 300 {
			t.Fatalf("%s %s = %d %s", s.method, s.suffix, rec.Code, rec.Body)
		}
	}
	if rec := upload(e, path, "file", "briefing.pdf", attachmentSamples["briefing.pdf"], a); rec.Code != http.StatusCreated {
		t.Fatalf("upload = %d", rec.Code)
	}
	return path
}

func TestClientViewIncludesVisibleBlocksOnly(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := filledProject(t, e, a)

	rec := get(e, path+"/client-view", a)
	if rec.Code != http.StatusOK {
		t.Fatalf("client-view = %d %s", rec.Code, rec.Body)
	}
	body := rec.Body.String()
	for _, want := range []string{"Ensaio", "Ana", "Helena", "Retratos em estúdio", "Galeria publicada", "Etapa Aberta", "Briefing aprovado", "150000", "Na assinatura", "briefing.pdf"} {
		if !strings.Contains(body, want) {
			t.Errorf("missing %q in %s", want, body)
		}
	}
	for _, secret := range []string{"NOTA-SECRETA", "TAREFA-SECRETA", "TAREFA-OCULTA", "Etapa Oculta", "ENTREGA-OCULTA", "tasks", "notes"} {
		if strings.Contains(body, secret) {
			t.Errorf("leaked %q in %s", secret, body)
		}
	}

	hide := map[string]bool{"scope": false, "stages": false, "deliverables": false, "price": false, "attachments": false}
	if rec := send(e, http.MethodPut, path+"/visibility", hide, a); rec.Code != http.StatusNoContent {
		t.Fatalf("PUT visibility = %d", rec.Code)
	}
	body = get(e, path+"/client-view", a).Body.String()
	for _, hidden := range []string{"Retratos em estúdio", "Galeria publicada", "Etapa Aberta", "Briefing aprovado", "150000", "Na assinatura", "briefing.pdf"} {
		if strings.Contains(body, hidden) {
			t.Errorf("hidden block leaked %q in %s", hidden, body)
		}
	}
	for _, kept := range []string{"Ensaio", "Ana", "Helena"} {
		if !strings.Contains(body, kept) {
			t.Errorf("identification lost %q in %s", kept, body)
		}
	}
}

func TestClientViewAccess(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	b := signedUpAs(t, e, "bruno@example.com")
	path := blankProject(t, e, a)
	if rec := get(e, path+"/client-view", b); rec.Code != http.StatusNotFound {
		t.Errorf("other user = %d", rec.Code)
	}
	if rec := get(e, path+"/client-view"); rec.Code != http.StatusUnauthorized {
		t.Errorf("anonymous = %d", rec.Code)
	}
}
