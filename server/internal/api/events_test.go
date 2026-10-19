package api_test

import (
	"database/sql"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"testing"
)

func projectIDOf(path string) int64 {
	id, _ := strconv.ParseInt(path[strings.LastIndex(path, "/")+1:], 10, 64)
	return id
}

func recordedEvents(t *testing.T, db *sql.DB, path string) []string {
	t.Helper()
	rows, err := db.Query(`SELECT kind, actor, shared FROM project_events WHERE project_id = ? ORDER BY id`, projectIDOf(path))
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var got []string
	for rows.Next() {
		var kind, actor string
		var shared bool
		if err := rows.Scan(&kind, &actor, &shared); err != nil {
			t.Fatal(err)
		}
		got = append(got, kind+"/"+actor+"/"+strconv.FormatBool(shared))
	}
	return got
}

func assertEvents(t *testing.T, db *sql.DB, path string, want ...string) {
	t.Helper()
	if got := recordedEvents(t, db, path); !slices.Equal(got, want) {
		t.Fatalf("events = %v, want %v", got, want)
	}
}

func TestEventsRecordContractAndClientActions(t *testing.T) {
	e, db := newServerDB(t)
	a := signedUp(t, e)
	path := filledProject(t, e, a)
	assertEvents(t, db, path, "project_created/pro/false")

	send(e, http.MethodPost, path+"/contract", nil, a)
	var l shareJSON
	decode(t, send(e, http.MethodPost, path+"/share", nil, a), &l)
	send(e, http.MethodPost, path+"/share", nil, a)
	assertEvents(t, db, path, "project_created/pro/false", "contract_finalized/pro/false", "version_shared/pro/true")

	portal := "/api/portal/" + l.Token
	get(e, portal)
	get(e, portal)
	send(e, http.MethodPost, portal+"/change", map[string]string{"message": "Trocar prazo"}, nil)
	send(e, http.MethodPost, path+"/contract/revision", map[string]string{"note": "Prazo trocado"}, a)
	send(e, http.MethodPost, portal+"/refuse", map[string]string{}, nil)
	assertEvents(t, db, path,
		"project_created/pro/false", "contract_finalized/pro/false", "version_shared/pro/true",
		"client_viewed/client/true", "change_requested/client/true", "revision_created/pro/true", "refused/client/true")

	send(e, http.MethodPost, path+"/share/regenerate", nil, a)
	decode(t, get(e, path+"/share", a), &l)
	get(e, "/api/portal/"+l.Token)
	got := recordedEvents(t, db, path)
	if n := len(got); got[n-2] != "version_shared/pro/true" || got[n-1] != "client_viewed/client/true" {
		t.Fatalf("after regenerate = %v", got)
	}
}

func TestEventsRecordSignatureAndArchive(t *testing.T) {
	e, db := newServerDB(t)
	a := signedUp(t, e)
	path, _ := signedProject(t, e, a)
	assertEvents(t, db, path,
		"project_created/pro/false", "contract_finalized/pro/false", "version_shared/pro/true", "signed/client/true")

	other := blankProject(t, e, a)
	send(e, http.MethodPost, other+"/archive", nil, a)
	send(e, http.MethodPost, other+"/archive", nil, a)
	assertEvents(t, db, other, "project_created/pro/false", "archived/pro/false")
}

func TestEventsRecordDeliveryCycleAndDuplicateDropsThem(t *testing.T) {
	e, db, _ := newServerAll(t)
	a := signedUp(t, e)
	path, l := signedProject(t, e, a)
	portal := "/api/portal/" + l.Token

	publishNext(t, e, path, a)
	send(e, http.MethodPost, portal+"/deliveries/1/adjust", map[string]string{"message": "Trocar a cor do logo."}, nil)
	publishNext(t, e, path, a)
	postApprove(e, l.Token, "2", map[string]bool{"confirm": true})
	if rec := send(e, http.MethodPost, path+"/complete", nil, a); rec.Code != http.StatusNoContent {
		t.Fatalf("complete = %d %s", rec.Code, rec.Body)
	}
	assertEvents(t, db, path,
		"project_created/pro/false", "contract_finalized/pro/false", "version_shared/pro/true", "signed/client/true",
		"delivery_published/pro/true", "adjust_requested/client/true", "delivery_published/pro/true", "approved/client/true", "completed/pro/true")

	var dup struct{ ID int }
	decode(t, send(e, http.MethodPost, path+"/duplicate", nil, a), &dup)
	assertEvents(t, db, "/api/projects/"+strconv.Itoa(dup.ID), "project_created/pro/false")
}
