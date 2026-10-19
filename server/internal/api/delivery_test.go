package api_test

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/labstack/echo/v5"
)

func TestDeliveryDBRejectsDraftsUnlessSignedAndFreezesPublished(t *testing.T) {
	e, db := newServerDB(t)
	a := signedUp(t, e)
	path := filledProject(t, e, a)
	const addDraft = `INSERT INTO deliveries (project_id) SELECT id FROM projects`
	const addFile = `INSERT INTO delivery_files (delivery_id, key, name, content_type, size) SELECT id, 'k' || id, 'a.pdf', 'application/pdf', 1 FROM deliveries`
	exec := func(q string) error {
		_, err := db.ExecContext(t.Context(), q)
		return err
	}

	if exec(addDraft) == nil {
		t.Fatal("draft accepted on unsigned project")
	}
	if rec := send(e, http.MethodPost, path+"/contract", nil, a); rec.Code != http.StatusCreated {
		t.Fatalf("finalize = %d", rec.Code)
	}
	if exec(addDraft) == nil {
		t.Fatal("draft accepted on final project")
	}
	if err := exec(`UPDATE projects SET status = 'signed'`); err != nil {
		t.Fatalf("mark signed: %v", err)
	}
	if err := exec(addDraft); err != nil {
		t.Fatalf("draft on signed project: %v", err)
	}
	if err := exec(addFile); err != nil {
		t.Fatalf("file in draft: %v", err)
	}
	if err := exec(`UPDATE deliveries SET title = 'Entrega'`); err != nil {
		t.Fatalf("edit draft: %v", err)
	}
	if err := exec(`UPDATE deliveries SET number = 1, published_at = '2026-01-01T00:00:00Z'`); err != nil {
		t.Fatalf("publish: %v", err)
	}
	for _, q := range []string{
		`UPDATE deliveries SET title = 'Outro'`,
		`DELETE FROM deliveries`,
		`UPDATE delivery_files SET name = 'b.pdf'`,
		`DELETE FROM delivery_files`,
		addFile,
	} {
		if exec(q) == nil {
			t.Errorf("%s succeeded on published delivery", q)
		}
	}
}

type deliveryJSON struct {
	Number      *int             `json:"number"`
	Title       string           `json:"title"`
	Message     string           `json:"message"`
	PublishedAt *string          `json:"publishedAt"`
	Files       []attachmentJSON `json:"files"`
}

type deliveriesJSON struct {
	Draft     *deliveryJSON  `json:"draft"`
	Published []deliveryJSON `json:"published"`
}

func deliveriesOf(t *testing.T, e *echo.Echo, path string, a *http.Cookie) deliveriesJSON {
	t.Helper()
	rec := get(e, path+"/deliveries", a)
	if rec.Code != http.StatusOK {
		t.Fatalf("deliveries = %d %s", rec.Code, rec.Body)
	}
	var got deliveriesJSON
	decode(t, rec, &got)
	return got
}

func TestDeliveryDraftFilesUploadListDelete(t *testing.T) {
	e, files := newAttachmentServer(t)
	a := signedUp(t, e)
	path, _ := signedProject(t, e, a)
	url := path + "/deliveries/draft/files"

	if got := deliveriesOf(t, e, path, a); got.Draft != nil || len(got.Published) != 0 {
		t.Fatalf("empty = %+v", got)
	}
	var first, second attachmentJSON
	decode(t, uploadTo(e, url, "file", "briefing.pdf", attachmentSamples["briefing.pdf"], a), &first)
	rec := uploadTo(e, url, "file", "logo.png", attachmentSamples["logo.png"], a)
	if rec.Code != http.StatusCreated {
		t.Fatalf("upload = %d %s", rec.Code, rec.Body)
	}
	decode(t, rec, &second)
	got := deliveriesOf(t, e, path, a)
	if got.Draft == nil || len(got.Draft.Files) != 2 || got.Draft.Files[0] != first || got.Draft.Files[1] != second || files.Len() != 3 {
		t.Fatalf("draft = %+v, objects = %d", got.Draft, files.Len())
	}
	if rec := send(e, http.MethodDelete, url+"/"+strconv.Itoa(first.ID), nil, a); rec.Code != http.StatusNoContent {
		t.Fatalf("delete = %d", rec.Code)
	}
	if got := deliveriesOf(t, e, path, a); len(got.Draft.Files) != 1 || files.Len() != 2 {
		t.Fatalf("after delete = %+v, objects = %d", got.Draft, files.Len())
	}
	if rec := send(e, http.MethodDelete, url+"/999", nil, a); rec.Code != http.StatusNotFound {
		t.Errorf("delete unknown = %d", rec.Code)
	}
}

func TestDeliveryRejectsOtherUserUnsignedAndBadFile(t *testing.T) {
	e, files := newAttachmentServer(t)
	a := signedUp(t, e)
	path, _ := signedProject(t, e, a)
	url := path + "/deliveries/draft/files"
	b := signedUpAs(t, e, "bruno@example.com")

	if rec := uploadTo(e, url, "file", "briefing.pdf", attachmentSamples["briefing.pdf"], b); rec.Code != http.StatusNotFound {
		t.Errorf("other user upload = %d", rec.Code)
	}
	if rec := get(e, path+"/deliveries", b); rec.Code != http.StatusNotFound {
		t.Errorf("other user list = %d", rec.Code)
	}
	if rec := uploadTo(e, url, "file", "run.exe", []byte("MZ"), a); rec.Code != http.StatusBadRequest {
		t.Errorf("bad type = %d", rec.Code)
	}
	if got := deliveriesOf(t, e, path, a); got.Draft != nil && len(got.Draft.Files) != 0 || files.Len() != 1 {
		t.Errorf("rejected uploads left %+v, objects = %d", got.Draft, files.Len())
	}

	unsigned := filledProject(t, e, a)
	rec := uploadTo(e, unsigned+"/deliveries/draft/files", "file", "briefing.pdf", attachmentSamples["briefing.pdf"], a)
	if rec.Code != http.StatusConflict {
		t.Errorf("unsigned upload = %d", rec.Code)
	}
}

func publishDraft(e *echo.Echo, path string, title, message string, a *http.Cookie) *httptest.ResponseRecorder {
	return send(e, http.MethodPost, path+"/deliveries/draft/publish", map[string]string{"title": title, "message": message}, a)
}

func TestDeliveryPublishAssignsNumbersAndClearsDraft(t *testing.T) {
	e, _ := newAttachmentServer(t)
	a := signedUp(t, e)
	path, _ := signedProject(t, e, a)
	url := path + "/deliveries/draft/files"

	uploadTo(e, url, "file", "briefing.pdf", attachmentSamples["briefing.pdf"], a)
	if rec := publishDraft(e, path, "  Entrega final ", "Segue o material.", a); rec.Code != http.StatusNoContent {
		t.Fatalf("publish = %d %s", rec.Code, rec.Body)
	}
	got := deliveriesOf(t, e, path, a)
	if got.Draft != nil || len(got.Published) != 1 {
		t.Fatalf("after first = %+v", got)
	}
	first := got.Published[0]
	if first.Number == nil || *first.Number != 1 || first.Title != "Entrega final" || first.Message != "Segue o material." ||
		first.PublishedAt == nil || len(first.Files) != 1 || first.Files[0].Name != "briefing.pdf" {
		t.Fatalf("first = %+v", first)
	}

	uploadTo(e, url, "file", "logo.png", attachmentSamples["logo.png"], a)
	if rec := publishDraft(e, path, "Ajustes", "", a); rec.Code != http.StatusNoContent {
		t.Fatalf("second publish = %d %s", rec.Code, rec.Body)
	}
	got = deliveriesOf(t, e, path, a)
	if got.Draft != nil || len(got.Published) != 2 || *got.Published[0].Number != 2 || got.Published[0].Title != "Ajustes" ||
		*got.Published[1].Number != 1 || len(got.Published[1].Files) != 1 {
		t.Fatalf("after second = %+v", got)
	}
}

func TestDeliveryPublishRejectsInvalidDrafts(t *testing.T) {
	e, _ := newAttachmentServer(t)
	a := signedUp(t, e)
	path, _ := signedProject(t, e, a)

	if rec := publishDraft(e, path, "Entrega", "", a); rec.Code != http.StatusBadRequest {
		t.Errorf("no draft = %d", rec.Code)
	}
	uploadTo(e, path+"/deliveries/draft/files", "file", "briefing.pdf", attachmentSamples["briefing.pdf"], a)
	for name, in := range map[string][2]string{
		"blank title": {"  ", ""},
		"long title":  {strings.Repeat("a", 121), ""},
		"long note":   {"Entrega", strings.Repeat("a", 2001)},
	} {
		if rec := publishDraft(e, path, in[0], in[1], a); rec.Code != http.StatusBadRequest {
			t.Errorf("%s = %d", name, rec.Code)
		}
	}
	if got := deliveriesOf(t, e, path, a); got.Draft == nil || len(got.Draft.Files) != 1 || len(got.Published) != 0 {
		t.Errorf("rejected publish changed state: %+v", got)
	}
	b := signedUpAs(t, e, "bruno@example.com")
	if rec := publishDraft(e, path, "Entrega", "", b); rec.Code != http.StatusNotFound {
		t.Errorf("other user = %d", rec.Code)
	}
	if rec := publishDraft(e, filledProject(t, e, a), "Entrega", "", a); rec.Code != http.StatusConflict {
		t.Errorf("unsigned = %d", rec.Code)
	}
}
