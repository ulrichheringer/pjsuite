package api_test

import (
	"net/http"
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
