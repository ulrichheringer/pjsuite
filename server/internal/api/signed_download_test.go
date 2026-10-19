package api_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"testing"
	"time"

	"github.com/ulrichheringer/pjsuite/server/internal/storage"
)

type fakeSigner struct{ *storage.Memory }

func (f fakeSigner) SignedURL(_ context.Context, key, name, contentType string, ttl time.Duration) (string, error) {
	q := url.Values{"name": {name}, "type": {contentType}, "ttl": {ttl.String()}}
	return "https://r2.test/" + key + "?" + q.Encode(), nil
}

func assertRedirect(t *testing.T, rec *httptest.ResponseRecorder, name, contentType string) {
	t.Helper()
	if rec.Code != http.StatusFound {
		t.Fatalf("status = %d, want 302", rec.Code)
	}
	loc, err := url.Parse(rec.Header().Get("Location"))
	if err != nil || loc.Host != "r2.test" {
		t.Fatalf("Location = %q", rec.Header().Get("Location"))
	}
	q := loc.Query()
	if q.Get("name") != name || q.Get("type") != contentType || q.Get("ttl") != "5m0s" {
		t.Fatalf("signed query = %v", q)
	}
}

func assertNotRedirected(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()
	if rec.Code != http.StatusNotFound || rec.Header().Get("Location") != "" {
		t.Fatalf("status = %d, Location = %q, want plain 404", rec.Code, rec.Header().Get("Location"))
	}
}

func TestSignedDownloadsRedirectWhenStoreSigns(t *testing.T) {
	e, db := newServerWith(t, fakeSigner{storage.NewMemory()})
	a := signedUp(t, e)
	other := signedUpAs(t, e, "bruno@example.com")
	path, l := signedProject(t, e, a)
	data := attachmentSamples["briefing.pdf"]
	var att attachmentJSON
	draftPath := blankProject(t, e, a)
	decode(t, upload(e, draftPath, "file", "briefing.pdf", data, a), &att)
	attURL := draftPath + "/attachments/" + strconv.Itoa(att.ID)
	assertRedirect(t, get(e, attURL, a), "briefing.pdf", "application/pdf")
	assertNotRedirected(t, get(e, attURL, other))

	stage := executionOf(t, e, path, a)[0]
	stageURL := path + "/stages/" + strconv.Itoa(stage.ID) + "/files"
	var sf attachmentJSON
	decode(t, uploadTo(e, stageURL, "file", "briefing.pdf", data, a), &sf)
	fileURL := stageURL + "/" + strconv.Itoa(sf.ID)
	assertRedirect(t, get(e, fileURL, a), "briefing.pdf", "application/pdf")
	assertNotRedirected(t, get(e, fileURL, other))

	file := publishedFile(t, e, path, "briefing.pdf", data, a)
	portalURL := "/api/portal/" + l.Token + "/deliveries/1/files/" + strconv.Itoa(file.ID)
	assertRedirect(t, get(e, portalURL), "briefing.pdf", "application/pdf")
	assertNotRedirected(t, get(e, "/api/portal/wrong/deliveries/1/files/"+strconv.Itoa(file.ID)))

	if _, err := db.ExecContext(t.Context(), `UPDATE projects SET archived_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE status = 'signed'`); err != nil {
		t.Fatal(err)
	}
	assertNotRedirected(t, get(e, portalURL))
}
