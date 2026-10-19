package api_test

import (
	"net/http"
	"strings"
	"testing"

	"github.com/labstack/echo/v5"
)

func blankProject(t *testing.T, e *echo.Echo, cookie *http.Cookie) string {
	t.Helper()
	return createdProject(t, e, cookie, map[string]any{"name": "Ensaio", "clientId": clientID(t, e, cookie, "Ana"), "structure": "blank"})
}

func listStages(t *testing.T, e *echo.Echo, path string, cookie *http.Cookie) []map[string]any {
	t.Helper()
	rec := get(e, path+"/stages", cookie)
	if rec.Code != http.StatusOK {
		t.Fatalf("list stages = %d %s", rec.Code, rec.Body)
	}
	var got []map[string]any
	decode(t, rec, &got)
	return got
}

func TestStagesCreateAndList(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := blankProject(t, e, a)

	if got := listStages(t, e, path, a); len(got) != 0 {
		t.Fatalf("blank stages = %v", got)
	}
	first := map[string]any{"name": " Descoberta ", "timingKind": "deadline", "timing": "Até 05 out", "deliverable": "Briefing", "visible": true, "tasks": []string{"Kickoff", " ", "Objetivos"}}
	if rec := send(e, http.MethodPost, path+"/stages", first, a); rec.Code != http.StatusCreated {
		t.Fatalf("POST = %d %s", rec.Code, rec.Body)
	}
	send(e, http.MethodPost, path+"/stages", map[string]any{"name": "Entrega", "timingKind": "none", "timing": "ignorado", "visible": false}, a)

	got := listStages(t, e, path, a)
	if len(got) != 2 {
		t.Fatalf("stages = %v", got)
	}
	s := got[0]
	tasks, _ := s["tasks"].([]any)
	if s["id"] == nil || s["name"] != "Descoberta" || s["timingKind"] != "deadline" || s["timing"] != "Até 05 out" || s["deliverable"] != "Briefing" || s["visible"] != true ||
		len(tasks) != 2 || tasks[0].(map[string]any)["title"] != "Kickoff" || tasks[1].(map[string]any)["id"] == nil {
		t.Fatalf("first = %v", s)
	}
	if got[1]["name"] != "Entrega" || got[1]["timing"] != "" || got[1]["visible"] != false {
		t.Fatalf("second = %v", got[1])
	}
}

func TestStagesCreateValidation(t *testing.T) {
	tests := []struct {
		name, field string
		body        map[string]any
	}{
		{"empty name", "name", map[string]any{"name": " ", "timingKind": "none"}},
		{"name over 120", "name", map[string]any{"name": strings.Repeat("a", 121), "timingKind": "none"}},
		{"bad timing kind", "timingKind", map[string]any{"name": "X", "timingKind": "weekly"}},
		{"timing over 120", "timing", map[string]any{"name": "X", "timingKind": "date", "timing": strings.Repeat("a", 121)}},
		{"deliverable over 200", "deliverable", map[string]any{"name": "X", "timingKind": "none", "deliverable": strings.Repeat("a", 201)}},
		{"task over 200", "tasks", map[string]any{"name": "X", "timingKind": "none", "tasks": []string{strings.Repeat("a", 201)}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e := newServer(t)
			a := signedUp(t, e)
			rec := send(e, http.MethodPost, blankProject(t, e, a)+"/stages", tt.body, a)
			var got struct{ Errors map[string]string }
			decode(t, rec, &got)
			if rec.Code != http.StatusBadRequest || got.Errors[tt.field] == "" {
				t.Fatalf("POST = %d %s", rec.Code, rec.Body)
			}
		})
	}
}

func TestStagesOfAnotherUserAre404(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	b := signedUpAs(t, e, "bruno@example.com")
	path := blankProject(t, e, a)

	body := map[string]any{"name": "X", "timingKind": "none"}
	if rec := send(e, http.MethodPost, path+"/stages", body, b); rec.Code != http.StatusNotFound {
		t.Errorf("POST = %d", rec.Code)
	}
	if rec := get(e, path+"/stages", b); rec.Code != http.StatusNotFound {
		t.Errorf("GET = %d", rec.Code)
	}
	if rec := get(e, path+"/stages"); rec.Code != http.StatusUnauthorized {
		t.Errorf("anonymous = %d", rec.Code)
	}
}
