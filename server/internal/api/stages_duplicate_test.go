package api_test

import (
	"net/http"
	"reflect"
	"strconv"
	"testing"
)

func TestProjectDuplicateCopiesStructure(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := blankProject(t, e, a)
	createdStage(t, e, path, a, map[string]any{"name": "Um", "timingKind": "deadline", "timing": "Até 05 out", "deliverable": "Briefing", "visible": true, "tasks": []string{"a", "b"}})
	createdStage(t, e, path, a, map[string]any{"name": "Dois", "timingKind": "none", "visible": false, "tasks": []string{"c"}})
	if rec := send(e, http.MethodPut, path+"/builder", map[string]any{"scope": "Escopo", "outcome": "Resultado", "notes": "Nota interna"}, a); rec.Code != http.StatusNoContent {
		t.Fatalf("builder = %d", rec.Code)
	}

	var copied map[string]any
	rec := send(e, http.MethodPost, path+"/duplicate", nil, a)
	decode(t, rec, &copied)
	if rec.Code != http.StatusCreated || copied["scope"] != "Escopo" || copied["outcome"] != "Resultado" || copied["notes"] != "Nota interna" {
		t.Fatalf("copy = %d %v", rec.Code, copied)
	}

	copyPath := "/api/projects/" + strconv.Itoa(int(copied["id"].(float64)))
	want, got := listStages(t, e, path, a), listStages(t, e, copyPath, a)
	if len(got) != 2 {
		t.Fatalf("copy stages = %v", got)
	}
	for i := range want {
		if want[i]["id"] == got[i]["id"] {
			t.Errorf("stage %d shares id with original", i)
		}
		for _, tasks := range [][]any{want[i]["tasks"].([]any), got[i]["tasks"].([]any)} {
			for _, task := range tasks {
				delete(task.(map[string]any), "id")
			}
		}
		delete(want[i], "id")
		delete(got[i], "id")
		if !reflect.DeepEqual(want[i], got[i]) {
			t.Errorf("stage %d = %v, want %v", i, got[i], want[i])
		}
	}
	if len(listStages(t, e, path, a)) != 2 {
		t.Fatal("original stages changed")
	}
}
