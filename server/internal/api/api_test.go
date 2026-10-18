package api_test

import (
	"bytes"
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
	db, err := store.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	if err := store.Migrate(t.Context(), db); err != nil {
		t.Fatal(err)
	}
	return api.New(db)
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
