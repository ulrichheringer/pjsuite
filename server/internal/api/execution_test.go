package api_test

import (
	"net/http"
	"strconv"
	"strings"
	"testing"

	"github.com/labstack/echo/v5"
)

func TestExecutionDBRejectsStatusAndFilesUnlessSigned(t *testing.T) {
	e, db := newServerDB(t)
	a := signedUp(t, e)
	path := filledProject(t, e, a)
	const setStatus = `UPDATE stages SET status = 'in_progress'`
	const addFile = `INSERT INTO stage_files (stage_id, key, name, content_type, size) SELECT id, 'k' || id, 'a.pdf', 'application/pdf', 1 FROM stages`

	for _, q := range []string{setStatus, addFile} {
		if _, err := db.ExecContext(t.Context(), q); err == nil {
			t.Errorf("%s succeeded on unsigned project", q)
		}
	}
	if rec := send(e, http.MethodPost, path+"/contract", nil, a); rec.Code != http.StatusCreated {
		t.Fatalf("finalize = %d", rec.Code)
	}
	for _, q := range []string{setStatus, addFile} {
		if _, err := db.ExecContext(t.Context(), q); err == nil {
			t.Errorf("%s succeeded on final project", q)
		}
	}
	if _, err := db.ExecContext(t.Context(), `UPDATE projects SET status = 'signed'`); err != nil {
		t.Fatalf("mark signed: %v", err)
	}
	for _, q := range []string{setStatus, addFile} {
		if _, err := db.ExecContext(t.Context(), q); err != nil {
			t.Errorf("%s on signed project: %v", q, err)
		}
	}
}

type executionTaskJSON struct {
	ID    int    `json:"id"`
	Title string `json:"title"`
	Done  bool   `json:"done"`
}

type executionStageJSON struct {
	ID     int                 `json:"id"`
	Name   string              `json:"name"`
	Status string              `json:"status"`
	Tasks  []executionTaskJSON `json:"tasks"`
	Files  []map[string]any    `json:"files"`
}

func executionOf(t *testing.T, e *echo.Echo, path string, a *http.Cookie) []executionStageJSON {
	t.Helper()
	rec := get(e, path+"/execution", a)
	if rec.Code != http.StatusOK {
		t.Fatalf("execution = %d %s", rec.Code, rec.Body)
	}
	var got []executionStageJSON
	decode(t, rec, &got)
	return got
}

func TestExecutionListsStagesWithTasksAndFiles(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, _ := signedProject(t, e, a)

	got := executionOf(t, e, path, a)
	if len(got) != 2 || got[0].Name != "Etapa Aberta" || got[0].Status != "pending" {
		t.Fatalf("execution = %+v", got)
	}
	if len(got[0].Tasks) != 1 || got[0].Tasks[0].Title != "TAREFA-SECRETA" || got[0].Tasks[0].Done {
		t.Fatalf("tasks = %+v", got[0].Tasks)
	}
	if got[0].Files == nil || len(got[0].Files) != 0 || got[1].Tasks == nil {
		t.Fatalf("empty lists must serialize as arrays: %+v", got)
	}
}

func TestExecutionTasksAddRenameToggleDelete(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, _ := signedProject(t, e, a)
	stage := executionOf(t, e, path, a)[0]
	stagePath := path + "/stages/" + strconv.Itoa(stage.ID)

	rec := send(e, http.MethodPost, stagePath+"/tasks", map[string]string{"title": "  Enviar prévia  "}, a)
	if rec.Code != http.StatusCreated {
		t.Fatalf("add = %d %s", rec.Code, rec.Body)
	}
	var added executionTaskJSON
	decode(t, rec, &added)
	if added.Title != "Enviar prévia" || added.Done || added.ID == 0 {
		t.Fatalf("added = %+v", added)
	}
	taskPath := path + "/tasks/" + strconv.Itoa(added.ID)

	if rec := send(e, http.MethodPut, taskPath, map[string]any{"done": true}, a); rec.Code != http.StatusNoContent {
		t.Fatalf("toggle = %d %s", rec.Code, rec.Body)
	}
	if rec := send(e, http.MethodPut, taskPath, map[string]any{"title": "Prévia enviada"}, a); rec.Code != http.StatusNoContent {
		t.Fatalf("rename = %d %s", rec.Code, rec.Body)
	}
	tasks := executionOf(t, e, path, a)[0].Tasks
	if len(tasks) != 2 || tasks[1] != (executionTaskJSON{ID: added.ID, Title: "Prévia enviada", Done: true}) {
		t.Fatalf("tasks = %+v", tasks)
	}
	if rec := send(e, http.MethodPut, taskPath, map[string]any{"done": false}, a); rec.Code != http.StatusNoContent {
		t.Fatalf("untoggle = %d", rec.Code)
	}
	if tasks := executionOf(t, e, path, a)[0].Tasks; tasks[1].Done || tasks[1].Title != "Prévia enviada" {
		t.Fatalf("tasks = %+v", tasks)
	}
	if rec := send(e, http.MethodDelete, taskPath, nil, a); rec.Code != http.StatusNoContent {
		t.Fatalf("delete = %d", rec.Code)
	}
	if tasks := executionOf(t, e, path, a)[0].Tasks; len(tasks) != 1 {
		t.Fatalf("tasks = %+v", tasks)
	}
	if rec := send(e, http.MethodDelete, taskPath, nil, a); rec.Code != http.StatusNotFound {
		t.Fatalf("delete again = %d", rec.Code)
	}
}

func TestExecutionTasksRejectBadTitles(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, _ := signedProject(t, e, a)
	stage := executionOf(t, e, path, a)[0]
	taskPath := path + "/tasks/" + strconv.Itoa(stage.Tasks[0].ID)

	for _, title := range []string{"", "   ", strings.Repeat("a", 201)} {
		if rec := send(e, http.MethodPost, path+"/stages/"+strconv.Itoa(stage.ID)+"/tasks", map[string]string{"title": title}, a); rec.Code != http.StatusBadRequest {
			t.Errorf("add %d bytes = %d", len(title), rec.Code)
		}
		if rec := send(e, http.MethodPut, taskPath, map[string]string{"title": title}, a); rec.Code != http.StatusBadRequest {
			t.Errorf("rename %d bytes = %d", len(title), rec.Code)
		}
	}
	if got := executionOf(t, e, path, a)[0].Tasks; len(got) != 1 || got[0].Title != "TAREFA-SECRETA" {
		t.Fatalf("tasks = %+v", got)
	}
}

func TestExecutionRequiresSignedProject(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := filledProject(t, e, a)

	routes := []struct {
		method, path string
		body         any
	}{
		{http.MethodPost, path + "/stages/1/tasks", map[string]string{"title": "Nova"}},
		{http.MethodPut, path + "/tasks/1", map[string]bool{"done": true}},
		{http.MethodDelete, path + "/tasks/1", nil},
	}
	for _, r := range routes {
		rec := send(e, r.method, r.path, r.body, a)
		var got struct {
			Errors map[string]string `json:"errors"`
		}
		decode(t, rec, &got)
		if rec.Code != http.StatusConflict || got.Errors["execution"] != "A execução começa após a assinatura." {
			t.Errorf("%s %s = %d %v", r.method, r.path, rec.Code, got.Errors)
		}
	}
	if rec := send(e, http.MethodPost, path+"/archive", nil, a); rec.Code >= 300 {
		t.Fatalf("archive = %d", rec.Code)
	}
	rec := send(e, http.MethodPut, path+"/tasks/1", map[string]bool{"done": true}, a)
	var got struct {
		Errors map[string]string `json:"errors"`
	}
	decode(t, rec, &got)
	if rec.Code != http.StatusConflict || got.Errors["archived"] == "" {
		t.Errorf("archived = %d %v", rec.Code, got.Errors)
	}
}

func TestExecutionIsPrivateToTheOwner(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, _ := signedProject(t, e, a)
	stage := executionOf(t, e, path, a)[0]
	b := signedUpAs(t, e, "bruno@example.com")

	if rec := get(e, path+"/execution", b); rec.Code != http.StatusNotFound {
		t.Errorf("list = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, path+"/stages/"+strconv.Itoa(stage.ID)+"/tasks", map[string]string{"title": "x"}, b); rec.Code != http.StatusNotFound {
		t.Errorf("add = %d", rec.Code)
	}
	if rec := send(e, http.MethodPut, path+"/tasks/"+strconv.Itoa(stage.Tasks[0].ID), map[string]bool{"done": true}, b); rec.Code != http.StatusNotFound {
		t.Errorf("toggle = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, path+"/stages/999/tasks", map[string]string{"title": "x"}, a); rec.Code != http.StatusNotFound {
		t.Errorf("add to unknown stage = %d", rec.Code)
	}
	if rec := send(e, http.MethodPut, path+"/tasks/999", map[string]bool{"done": true}, a); rec.Code != http.StatusNotFound {
		t.Errorf("toggle unknown = %d", rec.Code)
	}
}

func TestExecutionStageStatusMovesThroughStates(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, _ := signedProject(t, e, a)
	stage := executionOf(t, e, path, a)[0]
	statusPath := path + "/stages/" + strconv.Itoa(stage.ID) + "/status"

	for _, status := range []string{"in_progress", "done", "pending"} {
		if rec := send(e, http.MethodPut, statusPath, map[string]string{"status": status}, a); rec.Code != http.StatusNoContent {
			t.Fatalf("set %s = %d %s", status, rec.Code, rec.Body)
		}
		got := executionOf(t, e, path, a)
		if got[0].Status != status || got[1].Status != "pending" {
			t.Fatalf("after %s: %+v", status, got)
		}
	}
}

func TestExecutionStageStatusRejectsBadInput(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, _ := signedProject(t, e, a)
	statusPath := path + "/stages/1/status"

	for _, body := range []map[string]string{{"status": "finished"}, {"status": ""}, {}} {
		if rec := send(e, http.MethodPut, statusPath, body, a); rec.Code != http.StatusBadRequest {
			t.Errorf("%v = %d", body, rec.Code)
		}
	}
	if rec := send(e, http.MethodPut, path+"/stages/999/status", map[string]string{"status": "done"}, a); rec.Code != http.StatusNotFound {
		t.Errorf("unknown stage = %d", rec.Code)
	}
	b := signedUpAs(t, e, "bruno@example.com")
	if rec := send(e, http.MethodPut, statusPath, map[string]string{"status": "done"}, b); rec.Code != http.StatusNotFound {
		t.Errorf("other user = %d", rec.Code)
	}
	if got := executionOf(t, e, path, a)[0].Status; got != "pending" {
		t.Fatalf("status = %s", got)
	}
}

func TestExecutionStageStatusRequiresSignedProject(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := filledProject(t, e, a)

	rec := send(e, http.MethodPut, path+"/stages/1/status", map[string]string{"status": "done"}, a)
	if rec.Code != http.StatusConflict {
		t.Fatalf("unsigned = %d", rec.Code)
	}
	if got := executionOf(t, e, path, a)[0].Status; got != "pending" {
		t.Fatalf("status = %s", got)
	}
}

func TestExecutionKeepsBuilderFrozenAfterSign(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, _ := signedProject(t, e, a)
	if rec := send(e, http.MethodPut, path+"/stages/1/status", map[string]string{"status": "in_progress"}, a); rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d", rec.Code)
	}
	for _, w := range []struct {
		method, suffix string
		body           any
	}{
		{http.MethodPut, "/stages/1", map[string]any{"name": "Novo", "timingKind": "none"}},
		{http.MethodDelete, "/stages/1", nil},
		{http.MethodPut, "/stages/order", map[string]any{"ids": []int{2, 1}}},
		{http.MethodPut, "/builder", map[string]any{"scope": "Novo"}},
	} {
		if rec := send(e, w.method, path+w.suffix, w.body, a); rec.Code != http.StatusConflict {
			t.Errorf("%s %s = %d", w.method, w.suffix, rec.Code)
		}
	}
}
