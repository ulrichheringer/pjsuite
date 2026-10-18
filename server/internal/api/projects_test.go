package api_test

import (
	"net/http"
	"strconv"
	"strings"
	"testing"

	"github.com/labstack/echo/v5"
)

func clientID(t *testing.T, e *echo.Echo, cookie *http.Cookie, name string) int {
	t.Helper()
	path := createdClient(t, e, cookie, name)
	var got struct{ ID int }
	decode(t, get(e, path, cookie), &got)
	return got.ID
}

func listProjects(t *testing.T, e *echo.Echo, query string, cookie *http.Cookie) []map[string]any {
	t.Helper()
	rec := get(e, "/api/projects"+query, cookie)
	if rec.Code != http.StatusOK {
		t.Fatalf("list = %d %s", rec.Code, rec.Body)
	}
	var got []map[string]any
	decode(t, rec, &got)
	return got
}

func TestProjectsCreateValidation(t *testing.T) {
	tests := []struct {
		name, field string
		mutate      func(body map[string]any, otherClient, archivedClient int)
	}{
		{"empty name", "name", func(b map[string]any, _, _ int) { b["name"] = " " }},
		{"name over 120", "name", func(b map[string]any, _, _ int) { b["name"] = strings.Repeat("a", 121) }},
		{"invalid area", "area", func(b map[string]any, _, _ int) { b["area"] = "Culinária" }},
		{"reference over 40", "reference", func(b map[string]any, _, _ int) { b["reference"] = strings.Repeat("a", 41) }},
		{"invalid structure", "structure", func(b map[string]any, _, _ int) { b["structure"] = "x" }},
		{"missing client", "client", func(b map[string]any, _, _ int) { delete(b, "clientId") }},
		{"other user's client", "client", func(b map[string]any, other, _ int) { b["clientId"] = other }},
		{"archived client", "client", func(b map[string]any, _, archived int) { b["clientId"] = archived }},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e := newServer(t)
			a := signedUp(t, e)
			b := signedUpAs(t, e, "bruno@example.com")
			archived := createdClient(t, e, a, "Velho")
			if rec := send(e, http.MethodPost, archived+"/archive", nil, a); rec.Code != http.StatusNoContent {
				t.Fatalf("archive = %d", rec.Code)
			}
			var arch struct{ ID int }
			decode(t, get(e, archived, a), &arch)
			body := map[string]any{"name": "Ensaio", "clientId": clientID(t, e, a, "Ana")}
			tt.mutate(body, clientID(t, e, b, "Beto"), arch.ID)

			rec := send(e, http.MethodPost, "/api/projects", body, a)
			var got struct{ Errors map[string]string }
			decode(t, rec, &got)
			if rec.Code != http.StatusBadRequest || got.Errors[tt.field] == "" {
				t.Fatalf("POST = %d %s", rec.Code, rec.Body)
			}
		})
	}
}

func TestProjectsCreateAndListOwnOnly(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	b := signedUpAs(t, e, "bruno@example.com")
	cid := clientID(t, e, a, "Ana")

	rec := send(e, http.MethodPost, "/api/projects", map[string]any{"name": " Ensaio ", "clientId": cid, "area": "Fotografia", "reference": "PJ-1", "goal": "Retratos"}, a)
	if rec.Code != http.StatusCreated {
		t.Fatalf("POST = %d %s", rec.Code, rec.Body)
	}

	got := listProjects(t, e, "", a)
	if len(got) != 1 {
		t.Fatalf("A list = %v", got)
	}
	p := got[0]
	if p["name"] != "Ensaio" || p["clientName"] != "Ana" || p["structure"] != "essential" || p["status"] != "draft" || p["area"] != "Fotografia" || p["archived"] != false {
		t.Fatalf("project = %v", p)
	}
	if got := listProjects(t, e, "", b); len(got) != 0 {
		t.Fatalf("B sees A's projects: %v", got)
	}
	if rec := get(e, "/api/projects"); rec.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous = %d", rec.Code)
	}
}

func createdProject(t *testing.T, e *echo.Echo, cookie *http.Cookie, body map[string]any) string {
	t.Helper()
	rec := send(e, http.MethodPost, "/api/projects", body, cookie)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create = %d %s", rec.Code, rec.Body)
	}
	var got struct{ ID int }
	decode(t, rec, &got)
	return "/api/projects/" + strconv.Itoa(got.ID)
}

func TestProjectsUpdatePersists(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	ana, bia := clientID(t, e, a, "Ana"), clientID(t, e, a, "Bia")
	path := createdProject(t, e, a, map[string]any{"name": "Ensaio", "clientId": ana, "structure": "suggested"})

	want := map[string]any{"name": "Ensaio de marca", "clientId": bia, "area": "Design", "reference": "PJ-2", "goal": "Identidade", "structure": "blank"}
	if rec := send(e, http.MethodPut, path, want, a); rec.Code != http.StatusNoContent {
		t.Fatalf("PUT = %d %s", rec.Code, rec.Body)
	}
	var got map[string]any
	decode(t, get(e, path, a), &got)
	for _, k := range []string{"name", "area", "reference", "goal"} {
		if got[k] != want[k] {
			t.Errorf("%s = %v, want %v", k, got[k], want[k])
		}
	}
	if got["clientName"] != "Bia" || got["structure"] != "suggested" || got["status"] != "draft" {
		t.Errorf("project = %v", got)
	}

	if rec := send(e, http.MethodPut, path, map[string]any{"name": "", "clientId": ana}, a); rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid PUT = %d", rec.Code)
	}
}

func TestProjectsOfAnotherUserAre404(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	b := signedUpAs(t, e, "bruno@example.com")
	path := createdProject(t, e, a, map[string]any{"name": "Ensaio", "clientId": clientID(t, e, a, "Ana")})

	for _, tt := range []struct{ method, path string }{
		{http.MethodGet, path},
		{http.MethodPut, path},
		{http.MethodGet, "/api/projects/abc"},
	} {
		if rec := send(e, tt.method, tt.path, map[string]any{"name": "X"}, b); rec.Code != http.StatusNotFound {
			t.Errorf("%s %s = %d", tt.method, tt.path, rec.Code)
		}
	}
}

func TestProjectsArchive(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	b := signedUpAs(t, e, "bruno@example.com")
	path := createdProject(t, e, a, map[string]any{"name": "Ensaio", "clientId": clientID(t, e, a, "Ana")})

	if rec := send(e, http.MethodPost, path+"/archive", nil, b); rec.Code != http.StatusNotFound {
		t.Fatalf("other user archive = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, path+"/archive", nil, a); rec.Code != http.StatusNoContent {
		t.Fatalf("archive = %d %s", rec.Code, rec.Body)
	}
	if got := listProjects(t, e, "", a); len(got) != 0 {
		t.Fatalf("active list = %v", got)
	}
	if got := listProjects(t, e, "?archived=1", a); len(got) != 1 || got[0]["archived"] != true {
		t.Fatalf("archived list = %v", got)
	}
	rec := send(e, http.MethodPut, path, map[string]any{"name": "Novo", "clientId": clientID(t, e, a, "Bia")}, a)
	if rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), `"errors":{"archived"`) {
		t.Fatalf("PUT archived = %d %s", rec.Code, rec.Body)
	}
}

func TestProjectsDuplicate(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	ana, bia := clientID(t, e, a, "Ana"), clientID(t, e, a, "Bia")
	path := createdProject(t, e, a, map[string]any{"name": "Ensaio", "clientId": ana, "area": "Design", "reference": "PJ-1", "goal": "Identidade", "structure": "suggested"})

	rec := send(e, http.MethodPost, path+"/duplicate", nil, a)
	if rec.Code != http.StatusCreated {
		t.Fatalf("duplicate = %d %s", rec.Code, rec.Body)
	}
	var got map[string]any
	decode(t, rec, &got)
	if got["id"] == nil || got["name"] != "Ensaio — cópia" || got["clientName"] != "Ana" || got["area"] != "Design" || got["goal"] != "Identidade" ||
		got["structure"] != "suggested" || got["status"] != "draft" || got["reference"] != "" {
		t.Fatalf("copy = %v", got)
	}

	rec = send(e, http.MethodPost, path+"/duplicate", map[string]any{"name": "Outro", "clientId": bia}, a)
	decode(t, rec, &got)
	if rec.Code != http.StatusCreated || got["name"] != "Outro" || got["clientName"] != "Bia" {
		t.Fatalf("override = %d %v", rec.Code, got)
	}

	var orig map[string]any
	decode(t, get(e, path, a), &orig)
	if orig["name"] != "Ensaio" || orig["reference"] != "PJ-1" || orig["clientName"] != "Ana" {
		t.Fatalf("original = %v", orig)
	}
	if got := listProjects(t, e, "", a); len(got) != 3 {
		t.Fatalf("list = %v", got)
	}

	if rec := send(e, http.MethodPost, path+"/archive", nil, a); rec.Code != http.StatusNoContent {
		t.Fatalf("archive = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, path+"/duplicate", nil, a); rec.Code != http.StatusCreated {
		t.Fatalf("duplicate archived = %d %s", rec.Code, rec.Body)
	}
}

func TestProjectsDuplicateRejectsBadClient(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	b := signedUpAs(t, e, "bruno@example.com")
	path := createdProject(t, e, a, map[string]any{"name": "Ensaio", "clientId": clientID(t, e, a, "Ana")})

	rec := send(e, http.MethodPost, path+"/duplicate", map[string]any{"clientId": clientID(t, e, b, "Beto")}, a)
	if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), `"client"`) {
		t.Fatalf("other user's client = %d %s", rec.Code, rec.Body)
	}
	if rec := send(e, http.MethodPost, path+"/duplicate", nil, b); rec.Code != http.StatusNotFound {
		t.Fatalf("other user duplicate = %d", rec.Code)
	}
}
