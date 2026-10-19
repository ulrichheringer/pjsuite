package api_test

import (
	"net/http"
	"strings"
	"testing"
)

func TestStagesBuilderRoundTrip(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := blankProject(t, e, a)

	var got map[string]any
	decode(t, get(e, path, a), &got)
	if got["scope"] != "" || got["outcome"] != "" || got["notes"] != "" {
		t.Fatalf("defaults = %v", got)
	}

	want := map[string]any{"scope": " Retratos em estúdio ", "outcome": "Galeria publicada", "notes": "Cliente prefere manhã"}
	if rec := send(e, http.MethodPut, path+"/builder", want, a); rec.Code != http.StatusNoContent {
		t.Fatalf("PUT = %d %s", rec.Code, rec.Body)
	}
	decode(t, get(e, path, a), &got)
	if got["scope"] != "Retratos em estúdio" || got["outcome"] != "Galeria publicada" || got["notes"] != "Cliente prefere manhã" {
		t.Fatalf("project = %v", got)
	}
	if got["name"] != "Ensaio" {
		t.Fatalf("builder PUT touched general data: %v", got)
	}
}

func TestStagesBuilderValidationAndAccess(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	b := signedUpAs(t, e, "bruno@example.com")
	path := blankProject(t, e, a)

	for field, limit := range map[string]int{"scope": 2000, "outcome": 1000, "notes": 2000} {
		rec := send(e, http.MethodPut, path+"/builder", map[string]any{field: strings.Repeat("a", limit+1)}, a)
		if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), `"`+field+`"`) {
			t.Errorf("%s over limit = %d %s", field, rec.Code, rec.Body)
		}
		if rec := send(e, http.MethodPut, path+"/builder", map[string]any{field: strings.Repeat("a", limit)}, a); rec.Code != http.StatusNoContent {
			t.Errorf("%s at limit = %d", field, rec.Code)
		}
	}
	if rec := send(e, http.MethodPut, path+"/builder", map[string]any{"scope": "x"}, b); rec.Code != http.StatusNotFound {
		t.Errorf("other user = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, path+"/archive", nil, a); rec.Code != http.StatusNoContent {
		t.Fatalf("archive = %d", rec.Code)
	}
	if rec := send(e, http.MethodPut, path+"/builder", map[string]any{"scope": "x"}, a); rec.Code != http.StatusConflict {
		t.Errorf("archived = %d", rec.Code)
	}
}
