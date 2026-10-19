package api_test

import (
	"net/http"
	"testing"
)

type shareJSON struct {
	Token    string  `json:"token"`
	URL      string  `json:"url"`
	ViewedAt *string `json:"viewedAt"`
	Request  *struct {
		Kind    string `json:"kind"`
		Message string `json:"message"`
		Version int    `json:"version"`
	} `json:"request"`
}

func TestShareCreateReturnsLinkAndMarksSent(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := filledProject(t, e, a)

	if rec := send(e, http.MethodPost, path+"/share", nil, a); rec.Code != http.StatusConflict {
		t.Fatalf("draft share = %d %s", rec.Code, rec.Body)
	}
	if rec := send(e, http.MethodPost, path+"/contract", nil, a); rec.Code != http.StatusCreated {
		t.Fatalf("finalize = %d", rec.Code)
	}
	rec := send(e, http.MethodPost, path+"/share", nil, a)
	if rec.Code != http.StatusOK {
		t.Fatalf("share = %d %s", rec.Code, rec.Body)
	}
	var first shareJSON
	decode(t, rec, &first)
	if len(first.Token) < 43 || first.URL != "/p/"+first.Token || first.ViewedAt != nil {
		t.Fatalf("share = %+v", first)
	}

	var again shareJSON
	decode(t, send(e, http.MethodPost, path+"/share", nil, a), &again)
	if again.Token != first.Token {
		t.Fatal("second POST created a new token")
	}
	var fetched shareJSON
	decode(t, get(e, path+"/share", a), &fetched)
	if fetched.Token != first.Token {
		t.Fatalf("GET = %+v", fetched)
	}

	var p map[string]any
	decode(t, get(e, path, a), &p)
	if p["status"] != "sent" {
		t.Fatalf("status = %v", p["status"])
	}

	b := signedUpAs(t, e, "bruno@example.com")
	if rec := get(e, path+"/share", b); rec.Code != http.StatusNotFound {
		t.Fatalf("other user GET = %d", rec.Code)
	}
}
