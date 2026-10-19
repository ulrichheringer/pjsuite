package api_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSessionCookieSecureBehindTLSProxy(t *testing.T) {
	tests := []struct {
		name, proto string
		secure      bool
	}{
		{"https proxy", "https", true},
		{"plain http", "", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e := newServer(t)
			signup := validSignup()
			post(e, "/api/signup", signup)
			buf, err := json.Marshal(map[string]any{"email": signup["email"], "password": signup["password"]})
			if err != nil {
				t.Fatal(err)
			}
			req := httptest.NewRequest(http.MethodPost, "/api/login", bytes.NewReader(buf))
			req.RemoteAddr = "127.0.0.1:50000"
			req.Header.Set("Content-Type", "application/json")
			if tt.proto != "" {
				req.Header.Set("X-Forwarded-Proto", tt.proto)
			}
			rec := httptest.NewRecorder()
			e.ServeHTTP(rec, req)
			cookies := rec.Result().Cookies()
			if len(cookies) != 1 || cookies[0].Secure != tt.secure {
				t.Fatalf("status %d, cookies %v, want Secure=%v", rec.Code, cookies, tt.secure)
			}
		})
	}
}
