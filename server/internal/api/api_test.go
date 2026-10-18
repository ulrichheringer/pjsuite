package api_test

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/labstack/echo/v5"

	"github.com/ulrichheringer/pjsuite/server/internal/api"
	"github.com/ulrichheringer/pjsuite/server/internal/store"
)

func newServer(t *testing.T) *echo.Echo {
	t.Helper()
	e, _ := newServerDB(t)
	return e
}

func newServerDB(t *testing.T) (*echo.Echo, *sql.DB) {
	t.Helper()
	db, err := store.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	if err := store.Migrate(t.Context(), db); err != nil {
		t.Fatal(err)
	}
	return api.New(db), db
}

func TestHealth(t *testing.T) {
	rec := httptest.NewRecorder()
	newServer(t).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
}

func post(e *echo.Echo, path string, body any, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	buf, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(buf))
	req.Header.Set("Content-Type", "application/json")
	for _, c := range cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	return rec
}

func validSignup() map[string]any {
	return map[string]any{"name": "Helena Duarte", "email": "helena@example.com", "password": "senha-segura", "acceptTerms": true}
}

func TestSignup(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(map[string]any)
		status int
		field  string
	}{
		{"ok", func(map[string]any) {}, http.StatusCreated, ""},
		{"email without @", func(b map[string]any) { b["email"] = "helena.example.com" }, http.StatusBadRequest, "email"},
		{"short password", func(b map[string]any) { b["password"] = "1234567" }, http.StatusBadRequest, "password"},
		{"missing name", func(b map[string]any) { b["name"] = " " }, http.StatusBadRequest, "name"},
		{"terms not accepted", func(b map[string]any) { b["acceptTerms"] = false }, http.StatusBadRequest, "acceptTerms"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body := validSignup()
			tt.mutate(body)
			rec := post(newServer(t), "/api/signup", body)
			if rec.Code != tt.status {
				t.Fatalf("status = %d, body = %s", rec.Code, rec.Body)
			}
			if tt.field != "" {
				var got struct{ Errors map[string]string }
				json.Unmarshal(rec.Body.Bytes(), &got)
				if got.Errors[tt.field] == "" {
					t.Fatalf("no error for %q: %s", tt.field, rec.Body)
				}
				return
			}
			if len(rec.Result().Cookies()) != 1 || !rec.Result().Cookies()[0].HttpOnly {
				t.Fatalf("want one HttpOnly session cookie, got %v", rec.Result().Cookies())
			}
		})
	}
}

func TestSignupDuplicateEmailIsCaseInsensitive(t *testing.T) {
	e := newServer(t)
	post(e, "/api/signup", validSignup())
	body := validSignup()
	body["email"] = "HELENA@example.com"
	rec := post(e, "/api/signup", body)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "E-mail já cadastrado") {
		t.Fatalf("body = %s", rec.Body)
	}
}

func get(e *echo.Echo, path string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	for _, c := range cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	return rec
}

func signedUp(t *testing.T, e *echo.Echo) *http.Cookie {
	t.Helper()
	rec := post(e, "/api/signup", validSignup())
	if rec.Code != http.StatusCreated {
		t.Fatalf("signup status = %d", rec.Code)
	}
	return rec.Result().Cookies()[0]
}

func TestSessionLifecycle(t *testing.T) {
	e := newServer(t)
	cookie := signedUp(t, e)

	rec := get(e, "/api/me", cookie)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "helena@example.com") {
		t.Fatalf("me = %d %s", rec.Code, rec.Body)
	}
	if rec := get(e, "/api/me"); rec.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous me = %d", rec.Code)
	}

	if rec := post(e, "/api/logout", nil, cookie); rec.Code != http.StatusNoContent {
		t.Fatalf("logout = %d", rec.Code)
	}
	if rec := get(e, "/api/me", cookie); rec.Code != http.StatusUnauthorized {
		t.Fatalf("me after logout = %d", rec.Code)
	}
}

func TestExpiredSessionIsRejected(t *testing.T) {
	e, db := newServerDB(t)
	cookie := signedUp(t, e)
	if _, err := db.Exec(`UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z'`); err != nil {
		t.Fatal(err)
	}
	if rec := get(e, "/api/me", cookie); rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d", rec.Code)
	}
}

func TestLogin(t *testing.T) {
	e := newServer(t)
	signedUp(t, e)
	tests := []struct {
		name, email, password string
		status                int
	}{
		{"ok", "helena@example.com", "senha-segura", http.StatusNoContent},
		{"email case-insensitive", "HELENA@example.com", "senha-segura", http.StatusNoContent},
		{"wrong password", "helena@example.com", "outra-senha", http.StatusUnauthorized},
		{"unknown email", "ninguem@example.com", "senha-segura", http.StatusUnauthorized},
	}
	var messages []string
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := post(e, "/api/login", map[string]any{"email": tt.email, "password": tt.password})
			if rec.Code != tt.status {
				t.Fatalf("status = %d", rec.Code)
			}
			if tt.status == http.StatusUnauthorized {
				messages = append(messages, rec.Body.String())
				return
			}
			if rec := get(e, "/api/me", rec.Result().Cookies()[0]); rec.Code != http.StatusOK {
				t.Fatalf("me = %d", rec.Code)
			}
		})
	}
	if len(messages) == 2 && messages[0] != messages[1] {
		t.Fatalf("login failures differ: %q vs %q", messages[0], messages[1])
	}
}
