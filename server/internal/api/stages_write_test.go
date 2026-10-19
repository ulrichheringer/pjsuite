package api_test

import (
	"net/http"
	"strconv"
	"testing"

	"github.com/labstack/echo/v5"
)

func createdStage(t *testing.T, e *echo.Echo, path string, cookie *http.Cookie, body map[string]any) string {
	t.Helper()
	rec := send(e, http.MethodPost, path+"/stages", body, cookie)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create stage = %d %s", rec.Code, rec.Body)
	}
	var got struct{ ID int }
	decode(t, rec, &got)
	return path + "/stages/" + strconv.Itoa(got.ID)
}

func TestStagesUpdateReplacesTasksAndKeepsOrder(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := blankProject(t, e, a)
	first := createdStage(t, e, path, a, map[string]any{"name": "Um", "timingKind": "none", "tasks": []string{"a", "b"}})
	createdStage(t, e, path, a, map[string]any{"name": "Dois", "timingKind": "none"})

	want := map[string]any{"name": "Um editado", "timingKind": "relative", "timing": "20 dias após", "deliverable": "Versão", "visible": true, "tasks": []string{"c", "d", "e"}}
	if rec := send(e, http.MethodPut, first, want, a); rec.Code != http.StatusNoContent {
		t.Fatalf("PUT = %d %s", rec.Code, rec.Body)
	}
	got := listStages(t, e, path, a)
	tasks := got[0]["tasks"].([]any)
	if got[0]["name"] != "Um editado" || got[0]["timingKind"] != "relative" || got[0]["timing"] != "20 dias após" || got[1]["name"] != "Dois" ||
		len(tasks) != 3 || tasks[0].(map[string]any)["title"] != "c" || tasks[2].(map[string]any)["title"] != "e" {
		t.Fatalf("stages = %v", got)
	}

	if rec := send(e, http.MethodPut, first, map[string]any{"name": "", "timingKind": "none"}, a); rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid PUT = %d", rec.Code)
	}
	if rec := send(e, http.MethodPut, path+"/stages/999999", want, a); rec.Code != http.StatusNotFound {
		t.Fatalf("missing stage PUT = %d", rec.Code)
	}
}

func TestStagesDelete(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	b := signedUpAs(t, e, "bruno@example.com")
	path := blankProject(t, e, a)
	first := createdStage(t, e, path, a, map[string]any{"name": "Um", "timingKind": "none", "tasks": []string{"a"}})
	createdStage(t, e, path, a, map[string]any{"name": "Dois", "timingKind": "none"})

	if rec := send(e, http.MethodDelete, first, nil, b); rec.Code != http.StatusNotFound {
		t.Fatalf("other user DELETE = %d", rec.Code)
	}
	if rec := send(e, http.MethodDelete, first, nil, a); rec.Code != http.StatusNoContent {
		t.Fatalf("DELETE = %d %s", rec.Code, rec.Body)
	}
	if got := listStages(t, e, path, a); len(got) != 1 || got[0]["name"] != "Dois" {
		t.Fatalf("stages = %v", got)
	}
	if rec := send(e, http.MethodDelete, first, nil, a); rec.Code != http.StatusNotFound {
		t.Fatalf("second DELETE = %d", rec.Code)
	}
}

func TestStagesReorder(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := blankProject(t, e, a)
	ids := make([]int, 3)
	for i, name := range []string{"Um", "Dois", "Três"} {
		var got struct{ ID int }
		decode(t, send(e, http.MethodPost, path+"/stages", map[string]any{"name": name, "timingKind": "none"}, a), &got)
		ids[i] = got.ID
	}

	if rec := send(e, http.MethodPut, path+"/stages/order", map[string]any{"ids": []int{ids[2], ids[0], ids[1]}}, a); rec.Code != http.StatusNoContent {
		t.Fatalf("reorder = %d %s", rec.Code, rec.Body)
	}
	got := listStages(t, e, path, a)
	if got[0]["name"] != "Três" || got[1]["name"] != "Um" || got[2]["name"] != "Dois" {
		t.Fatalf("stages = %v", got)
	}
	for _, bad := range [][]int{{ids[0]}, {ids[0], ids[0], ids[1]}, {ids[0], ids[1], 999999}} {
		if rec := send(e, http.MethodPut, path+"/stages/order", map[string]any{"ids": bad}, a); rec.Code != http.StatusBadRequest {
			t.Errorf("reorder %v = %d", bad, rec.Code)
		}
	}
}

func TestStagesWritesOnArchivedProjectAre409(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := blankProject(t, e, a)
	stage := createdStage(t, e, path, a, map[string]any{"name": "Um", "timingKind": "none"})
	if rec := send(e, http.MethodPost, path+"/archive", nil, a); rec.Code != http.StatusNoContent {
		t.Fatalf("archive = %d", rec.Code)
	}

	body := map[string]any{"name": "X", "timingKind": "none", "ids": []int{1}}
	for _, tt := range []struct{ method, path string }{
		{http.MethodPost, path + "/stages"},
		{http.MethodPut, stage},
		{http.MethodDelete, stage},
		{http.MethodPut, path + "/stages/order"},
	} {
		if rec := send(e, tt.method, tt.path, body, a); rec.Code != http.StatusConflict {
			t.Errorf("%s %s = %d", tt.method, tt.path, rec.Code)
		}
	}
	if got := listStages(t, e, path, a); len(got) != 1 {
		t.Fatalf("stages = %v", got)
	}
}
