package webui

import (
	"io/fs"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/labstack/echo/v5"
)

func TestEmbeddedIndexPresent(t *testing.T) {
	if _, err := fs.Stat(Files(), "index.html"); err != nil {
		t.Fatal(err)
	}
}

func get(t *testing.T, path string) *httptest.ResponseRecorder {
	t.Helper()
	files := fstest.MapFS{
		"index.html":  {Data: []byte("<html>app</html>")},
		"assets/x.js": {Data: []byte("console.log(1)")},
	}
	e := echo.New()
	e.GET("/*", Handler(files))
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	return rec
}

func TestHandler(t *testing.T) {
	tests := []struct {
		name, path   string
		status       int
		body         string
		cacheControl string
	}{
		{"root", "/", 200, "<html>app</html>", "no-cache"},
		{"spa route", "/projects/1", 200, "<html>app</html>", "no-cache"},
		{"asset", "/assets/x.js", 200, "console.log(1)", "public, max-age=31536000, immutable"},
		{"missing asset", "/assets/nope.js", 404, "", ""},
		{"unknown api", "/api/nope", 404, `"message"`, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := get(t, tt.path)
			if rec.Code != tt.status {
				t.Fatalf("status = %d, want %d", rec.Code, tt.status)
			}
			if !strings.Contains(rec.Body.String(), tt.body) {
				t.Fatalf("body = %q, want %q", rec.Body.String(), tt.body)
			}
			if got := rec.Header().Get("Cache-Control"); got != tt.cacheControl {
				t.Fatalf("Cache-Control = %q, want %q", got, tt.cacheControl)
			}
		})
	}
}

func TestUnknownAPIIsJSON(t *testing.T) {
	if ct := get(t, "/api/nope").Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Fatalf("Content-Type = %q", ct)
	}
}
