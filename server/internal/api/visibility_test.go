package api_test

import (
	"maps"
	"net/http"
	"testing"

	"github.com/labstack/echo/v5"
)

func getVisibility(t *testing.T, e *echo.Echo, path string, cookie *http.Cookie) map[string]bool {
	t.Helper()
	rec := get(e, path+"/visibility", cookie)
	if rec.Code != http.StatusOK {
		t.Fatalf("get visibility = %d %s", rec.Code, rec.Body)
	}
	var got map[string]bool
	decode(t, rec, &got)
	return got
}

func TestVisibilityRoundTrip(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := blankProject(t, e, a)

	all := map[string]bool{"scope": true, "stages": true, "deliverables": true, "price": true, "attachments": true}
	if got := getVisibility(t, e, path, a); !maps.Equal(got, all) {
		t.Fatalf("defaults = %v", got)
	}
	if rec := send(e, http.MethodPut, path+"/visibility", map[string]bool{"price": false, "scope": false}, a); rec.Code != http.StatusNoContent {
		t.Fatalf("PUT = %d %s", rec.Code, rec.Body)
	}
	want := maps.Clone(all)
	want["price"], want["scope"] = false, false
	if got := getVisibility(t, e, path, a); !maps.Equal(got, want) {
		t.Fatalf("after PUT = %v", got)
	}
	if rec := send(e, http.MethodPut, path+"/visibility", map[string]bool{"price": true}, a); rec.Code != http.StatusNoContent {
		t.Fatalf("PUT = %d", rec.Code)
	}
	want["price"] = true
	if got := getVisibility(t, e, path, a); !maps.Equal(got, want) {
		t.Fatalf("after second PUT = %v", got)
	}
}

func TestVisibilityValidationAndAccess(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	b := signedUpAs(t, e, "bruno@example.com")
	path := blankProject(t, e, a)

	for _, block := range []string{"tasks", "notes", "bogus"} {
		if rec := send(e, http.MethodPut, path+"/visibility", map[string]bool{block: true}, a); rec.Code != http.StatusBadRequest {
			t.Errorf("block %q = %d", block, rec.Code)
		}
	}
	if rec := get(e, path+"/visibility", b); rec.Code != http.StatusNotFound {
		t.Errorf("other user GET = %d", rec.Code)
	}
	if rec := send(e, http.MethodPut, path+"/visibility", map[string]bool{"price": false}, b); rec.Code != http.StatusNotFound {
		t.Errorf("other user PUT = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, path+"/archive", nil, a); rec.Code != http.StatusNoContent {
		t.Fatalf("archive = %d", rec.Code)
	}
	if rec := send(e, http.MethodPut, path+"/visibility", map[string]bool{"price": false}, a); rec.Code != http.StatusConflict {
		t.Errorf("archived PUT = %d", rec.Code)
	}
}
