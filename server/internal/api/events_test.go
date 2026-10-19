package api_test

import (
	"database/sql"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"testing"

	"github.com/labstack/echo/v5"
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

type eventJSON struct {
	ID        int    `json:"id"`
	Kind      string `json:"kind"`
	Actor     string `json:"actor"`
	ActorName string `json:"actorName"`
	Number    int    `json:"number"`
	Message   string `json:"message"`
	Shared    bool   `json:"shared"`
	CreatedAt string `json:"createdAt"`
}

func TestProjectEventsListNewestFirstOwnerScoped(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, l := finalizedShare(t, e, a)
	send(e, http.MethodPost, "/api/portal/"+l.Token+"/change", map[string]string{"message": "Trocar prazo"}, nil)

	rec := get(e, path+"/events", a)
	if rec.Code != http.StatusOK {
		t.Fatalf("events = %d %s", rec.Code, rec.Body)
	}
	var got []eventJSON
	decode(t, rec, &got)
	kinds := make([]string, len(got))
	for i, ev := range got {
		kinds[i] = ev.Kind
	}
	if want := []string{"change_requested", "version_shared", "contract_finalized", "project_created"}; !slices.Equal(kinds, want) {
		t.Fatalf("kinds = %v, want %v", kinds, want)
	}
	first := got[0]
	if first.Actor != "client" || first.ActorName != "Ana" || first.Number != 1 || first.Message != "Trocar prazo" || !first.Shared || first.CreatedAt == "" {
		t.Fatalf("first = %+v", first)
	}
	if last := got[3]; last.Actor != "pro" || last.ActorName != "Helena Duarte" || last.Shared {
		t.Fatalf("last = %+v", last)
	}
	if strings.Contains(rec.Body.String(), "readAt") {
		t.Errorf("body exposes readAt: %s", rec.Body)
	}

	if rec := get(e, path+"/events"); rec.Code != http.StatusUnauthorized {
		t.Errorf("anonymous = %d", rec.Code)
	}
	b := signedUpAs(t, e, "bruno@example.com")
	if rec := get(e, path+"/events", b); rec.Code != http.StatusNotFound {
		t.Errorf("other user = %d", rec.Code)
	}
	if rec := get(e, "/api/projects/999/events", a); rec.Code != http.StatusNotFound {
		t.Errorf("unknown project = %d", rec.Code)
	}
}

func TestPortalEventsExposeSharedOnlyThroughClientDTO(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, l := finalizedShare(t, e, a)
	portal := "/api/portal/" + l.Token
	send(e, http.MethodPost, portal+"/change", map[string]string{"message": "Trocar prazo"}, nil)

	rec := get(e, portal+"/events")
	if rec.Code != http.StatusOK {
		t.Fatalf("portal events = %d %s", rec.Code, rec.Body)
	}
	var got []map[string]any
	decode(t, rec, &got)
	if len(got) != 2 || got[0]["kind"] != "change_requested" || got[1]["kind"] != "version_shared" {
		t.Fatalf("events = %v", got)
	}
	for _, ev := range got {
		keys := make([]string, 0, len(ev))
		for k := range ev {
			keys = append(keys, k)
		}
		slices.Sort(keys)
		if want := []string{"actor", "actorName", "createdAt", "kind", "message", "number"}; !slices.Equal(keys, want) {
			t.Errorf("keys = %v, want %v", keys, want)
		}
	}
	if got[0]["actor"] != "client" || got[0]["actorName"] != "Ana" || got[0]["message"] != "Trocar prazo" || got[1]["actor"] != "pro" {
		t.Errorf("events = %v", got)
	}
	for _, internal := range []string{"project_created", "contract_finalized", "archived", "readAt", "read_at"} {
		if strings.Contains(rec.Body.String(), internal) {
			t.Errorf("body exposes %s: %s", internal, rec.Body)
		}
	}

	assertLinkInvalid(t, get(e, "/api/portal/desconhecido/events"))
	send(e, http.MethodPost, path+"/archive", nil, a)
	assertLinkInvalid(t, get(e, portal+"/events"))
}

type notificationsJSON struct {
	Unread int `json:"unread"`
	Items  []struct {
		ID          int    `json:"id"`
		ProjectID   int    `json:"projectId"`
		ProjectName string `json:"projectName"`
		Kind        string `json:"kind"`
		ActorName   string `json:"actorName"`
		Number      int    `json:"number"`
		Message     string `json:"message"`
		CreatedAt   string `json:"createdAt"`
		Read        bool   `json:"read"`
	} `json:"items"`
}

func notificationsOf(t *testing.T, e *echo.Echo, a *http.Cookie) notificationsJSON {
	t.Helper()
	rec := get(e, "/api/notifications", a)
	if rec.Code != http.StatusOK {
		t.Fatalf("notifications = %d %s", rec.Code, rec.Body)
	}
	var got notificationsJSON
	decode(t, rec, &got)
	return got
}

func TestNotificationsListClientEventsAndTrackReadState(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, l := finalizedShare(t, e, a)
	b := signedUpAs(t, e, "bruno@example.com")
	bPath, bl := finalizedShare(t, e, b)

	if got := notificationsOf(t, e, a); got.Unread != 0 || got.Items == nil || len(got.Items) != 0 {
		t.Fatalf("empty = %+v", got)
	}

	portal := "/api/portal/" + l.Token
	get(e, portal)
	send(e, http.MethodPost, portal+"/change", map[string]string{"message": "Trocar prazo"}, nil)
	send(e, http.MethodPost, "/api/portal/"+bl.Token+"/refuse", map[string]string{}, nil)

	got := notificationsOf(t, e, a)
	if got.Unread != 2 || len(got.Items) != 2 || got.Items[0].Kind != "change_requested" || got.Items[1].Kind != "client_viewed" {
		t.Fatalf("list = %+v", got)
	}
	first := got.Items[0]
	if first.ProjectID != int(projectIDOf(path)) || first.ProjectName != "Ensaio" || first.ActorName != "Ana" || first.Number != 1 || first.Message != "Trocar prazo" || first.CreatedAt == "" || first.Read {
		t.Fatalf("first = %+v", first)
	}
	if other := notificationsOf(t, e, b); other.Unread != 1 || len(other.Items) != 1 || other.Items[0].Kind != "refused" || other.Items[0].ProjectID != int(projectIDOf(bPath)) {
		t.Fatalf("other user = %+v", other)
	}

	id := strconv.Itoa(got.Items[1].ID)
	if rec := send(e, http.MethodPost, "/api/notifications/"+id+"/read", nil, b); rec.Code != http.StatusNotFound {
		t.Errorf("read other user's = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, "/api/notifications/999/read", nil, a); rec.Code != http.StatusNotFound {
		t.Errorf("read unknown = %d", rec.Code)
	}
	for i := range 2 {
		if rec := send(e, http.MethodPost, "/api/notifications/"+id+"/read", nil, a); rec.Code != http.StatusNoContent {
			t.Fatalf("read %d = %d %s", i, rec.Code, rec.Body)
		}
	}
	got = notificationsOf(t, e, a)
	if got.Unread != 1 || got.Items[0].Read || !got.Items[1].Read {
		t.Fatalf("after read = %+v", got)
	}

	if rec := send(e, http.MethodPost, "/api/notifications/read-all", nil, a); rec.Code != http.StatusNoContent {
		t.Fatalf("read-all = %d", rec.Code)
	}
	if got = notificationsOf(t, e, a); got.Unread != 0 || !got.Items[0].Read {
		t.Fatalf("after read-all = %+v", got)
	}
	if other := notificationsOf(t, e, b); other.Unread != 1 {
		t.Fatalf("other user read-all leak = %+v", other)
	}

	if rec := get(e, "/api/notifications"); rec.Code != http.StatusUnauthorized {
		t.Errorf("anonymous = %d", rec.Code)
	}
}
