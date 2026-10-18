package api_test

import (
	"net/http"
	"strconv"
	"strings"
	"testing"

	"github.com/labstack/echo/v5"
)

func signedUpAs(t *testing.T, e *echo.Echo, email string) *http.Cookie {
	t.Helper()
	body := validSignup()
	body["email"] = email
	rec := post(e, "/api/signup", body)
	if rec.Code != http.StatusCreated {
		t.Fatalf("signup status = %d", rec.Code)
	}
	return rec.Result().Cookies()[0]
}

func listClients(t *testing.T, e *echo.Echo, query string, cookie *http.Cookie) []map[string]any {
	t.Helper()
	rec := get(e, "/api/clients"+query, cookie)
	if rec.Code != http.StatusOK {
		t.Fatalf("list = %d %s", rec.Code, rec.Body)
	}
	var got []map[string]any
	decode(t, rec, &got)
	return got
}

func TestClientsCreateValidation(t *testing.T) {
	tests := []struct {
		name, field string
		body        map[string]any
	}{
		{"empty name", "name", map[string]any{"name": " "}},
		{"name over 120", "name", map[string]any{"name": strings.Repeat("a", 121)}},
		{"bad email", "email", map[string]any{"name": "Ana", "email": "sem-arroba"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e := newServer(t)
			rec := send(e, http.MethodPost, "/api/clients", tt.body, signedUp(t, e))
			var got struct{ Errors map[string]string }
			decode(t, rec, &got)
			if rec.Code != http.StatusBadRequest || got.Errors[tt.field] == "" {
				t.Fatalf("POST = %d %s", rec.Code, rec.Body)
			}
		})
	}
}

func TestClientsCreateAndListOwnOnly(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	b := signedUpAs(t, e, "bruno@example.com")

	rec := send(e, http.MethodPost, "/api/clients", map[string]any{"name": " Ana ", "email": "ana@example.com", "company": "Studio"}, a)
	if rec.Code != http.StatusCreated {
		t.Fatalf("POST = %d %s", rec.Code, rec.Body)
	}

	got := listClients(t, e, "", a)
	if len(got) != 1 || got[0]["name"] != "Ana" || got[0]["stage"] != "recent" || got[0]["company"] != "Studio" {
		t.Fatalf("A list = %v", got)
	}
	if got := listClients(t, e, "", b); len(got) != 0 {
		t.Fatalf("B sees A's clients: %v", got)
	}
	if rec := get(e, "/api/clients"); rec.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous = %d", rec.Code)
	}
}

func createdClient(t *testing.T, e *echo.Echo, cookie *http.Cookie, name string) string {
	t.Helper()
	rec := send(e, http.MethodPost, "/api/clients", map[string]any{"name": name}, cookie)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create = %d %s", rec.Code, rec.Body)
	}
	var got struct{ ID int }
	decode(t, rec, &got)
	return "/api/clients/" + strconv.Itoa(got.ID)
}

func TestClientsUpdatePersists(t *testing.T) {
	e := newServer(t)
	cookie := signedUp(t, e)
	path := createdClient(t, e, cookie, "Ana")

	want := map[string]any{"name": "Ana Lima", "email": "ana@example.com", "phone": "(31) 90000-0000", "company": "Studio", "notes": "Prefere WhatsApp."}
	if rec := send(e, http.MethodPut, path, want, cookie); rec.Code != http.StatusNoContent {
		t.Fatalf("PUT = %d %s", rec.Code, rec.Body)
	}
	var got map[string]any
	decode(t, get(e, path, cookie), &got)
	for k, v := range want {
		if got[k] != v {
			t.Errorf("%s = %v, want %v", k, got[k], v)
		}
	}
	if got["stage"] != "recent" {
		t.Errorf("stage = %v", got["stage"])
	}

	if rec := send(e, http.MethodPut, path, map[string]any{"name": ""}, cookie); rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid PUT = %d", rec.Code)
	}
}

func TestClientsStage(t *testing.T) {
	e := newServer(t)
	cookie := signedUp(t, e)
	path := createdClient(t, e, cookie, "Ana")

	if rec := send(e, http.MethodPut, path+"/stage", map[string]any{"stage": "proposal"}, cookie); rec.Code != http.StatusNoContent {
		t.Fatalf("stage = %d %s", rec.Code, rec.Body)
	}
	if got := listClients(t, e, "", cookie); got[0]["stage"] != "proposal" {
		t.Fatalf("list = %v", got)
	}
	rec := send(e, http.MethodPut, path+"/stage", map[string]any{"stage": "done"}, cookie)
	if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "stage") {
		t.Fatalf("invalid stage = %d %s", rec.Code, rec.Body)
	}
}

func TestClientsOfAnotherUserAre404(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	b := signedUpAs(t, e, "bruno@example.com")
	path := createdClient(t, e, a, "Ana")

	for _, tt := range []struct {
		method, path string
		body         any
	}{
		{http.MethodGet, path, nil},
		{http.MethodPut, path, map[string]any{"name": "X"}},
		{http.MethodPut, path + "/stage", map[string]any{"stage": "active"}},
		{http.MethodGet, "/api/clients/abc", nil},
	} {
		if rec := send(e, tt.method, tt.path, tt.body, b); rec.Code != http.StatusNotFound {
			t.Errorf("%s %s = %d", tt.method, tt.path, rec.Code)
		}
	}
}

func TestClientsArchiveAndRestore(t *testing.T) {
	e := newServer(t)
	cookie := signedUp(t, e)
	b := signedUpAs(t, e, "bruno@example.com")
	path := createdClient(t, e, cookie, "Ana")
	if rec := send(e, http.MethodPut, path+"/stage", map[string]any{"stage": "active"}, cookie); rec.Code != http.StatusNoContent {
		t.Fatalf("stage = %d", rec.Code)
	}

	if rec := send(e, http.MethodPost, path+"/archive", nil, b); rec.Code != http.StatusNotFound {
		t.Fatalf("other user archive = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, path+"/archive", nil, cookie); rec.Code != http.StatusNoContent {
		t.Fatalf("archive = %d %s", rec.Code, rec.Body)
	}
	if got := listClients(t, e, "", cookie); len(got) != 0 {
		t.Fatalf("active list = %v", got)
	}
	if got := listClients(t, e, "?archived=1", cookie); len(got) != 1 || got[0]["archived"] != true {
		t.Fatalf("archived list = %v", got)
	}

	rec := send(e, http.MethodPut, path, map[string]any{"name": "Novo"}, cookie)
	if rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), `"errors":{"archived"`) {
		t.Fatalf("PUT archived = %d %s", rec.Code, rec.Body)
	}
	if rec := send(e, http.MethodPut, path+"/stage", map[string]any{"stage": "recent"}, cookie); rec.Code != http.StatusConflict {
		t.Fatalf("stage archived = %d", rec.Code)
	}

	if rec := send(e, http.MethodPost, path+"/restore", nil, cookie); rec.Code != http.StatusNoContent {
		t.Fatalf("restore = %d %s", rec.Code, rec.Body)
	}
	got := listClients(t, e, "", cookie)
	if len(got) != 1 || got[0]["stage"] != "active" || got[0]["archived"] != false {
		t.Fatalf("restored list = %v", got)
	}
	if got := listClients(t, e, "?archived=1", cookie); len(got) != 0 {
		t.Fatalf("archived list = %v", got)
	}
}
