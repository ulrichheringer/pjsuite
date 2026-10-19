package api_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v5"
)

func publishNext(t *testing.T, e *echo.Echo, path string, a *http.Cookie) {
	t.Helper()
	mustUpload(t, e, path+"/deliveries/draft/files", "briefing.pdf", attachmentSamples["briefing.pdf"], a)
	if rec := publishDraft(e, path, "Entrega", "", a); rec.Code != http.StatusNoContent {
		t.Fatalf("publish = %d %s", rec.Code, rec.Body)
	}
}

func TestAdjustClientRequestsOnLatestDeliveryOnce(t *testing.T) {
	e, _ := newAttachmentServer(t)
	a := signedUp(t, e)
	path, l := signedProject(t, e, a)
	adjust := func(token, n, message string) *httptest.ResponseRecorder {
		return send(e, http.MethodPost, "/api/portal/"+token+"/deliveries/"+n+"/adjust", map[string]string{"message": message}, nil)
	}
	const ok = "Trocar a cor do logo."

	publishNext(t, e, path, a)
	assertLinkInvalid(t, adjust("wrong", "1", ok))
	if rec := adjust(l.Token, "7", ok); rec.Code != http.StatusNotFound {
		t.Errorf("unknown delivery = %d", rec.Code)
	}
	for name, message := range map[string]string{"short": strings.Repeat("a", 9), "blank": "   ", "long": strings.Repeat("a", 2001)} {
		if rec := adjust(l.Token, "1", message); rec.Code != http.StatusBadRequest {
			t.Errorf("%s message = %d", name, rec.Code)
		}
	}
	if rec := adjust(l.Token, "1", "  "+ok+" "); rec.Code != http.StatusNoContent {
		t.Fatalf("adjust = %d %s", rec.Code, rec.Body)
	}
	if rec := adjust(l.Token, "1", ok); rec.Code != http.StatusConflict {
		t.Errorf("second response = %d", rec.Code)
	}

	publishNext(t, e, path, a)
	if rec := adjust(l.Token, "1", ok); rec.Code != http.StatusConflict {
		t.Errorf("superseded delivery = %d", rec.Code)
	}
	if rec := adjust(l.Token, "2", ok); rec.Code != http.StatusNoContent {
		t.Errorf("latest after revision = %d", rec.Code)
	}
}

func postApprove(e *echo.Echo, token, n string, body any) *httptest.ResponseRecorder {
	return send(e, http.MethodPost, "/api/portal/"+token+"/deliveries/"+n+"/approve", body, nil)
}

func TestApproveRequiresConfirmationAndReturnsReceipt(t *testing.T) {
	e, _ := newAttachmentServer(t)
	a := signedUp(t, e)
	path, l := signedProject(t, e, a)
	confirm := map[string]bool{"confirm": true}

	publishNext(t, e, path, a)
	assertLinkInvalid(t, postApprove(e, "wrong", "1", confirm))
	if rec := postApprove(e, l.Token, "7", confirm); rec.Code != http.StatusNotFound {
		t.Errorf("unknown delivery = %d", rec.Code)
	}
	for name, body := range map[string]any{"missing": map[string]string{}, "false": map[string]bool{"confirm": false}} {
		if rec := postApprove(e, l.Token, "1", body); rec.Code != http.StatusBadRequest {
			t.Errorf("%s confirm = %d", name, rec.Code)
		}
	}
	rec := postApprove(e, l.Token, "1", confirm)
	if rec.Code != http.StatusOK {
		t.Fatalf("approve = %d %s", rec.Code, rec.Body)
	}
	var got struct {
		ApprovedAt string `json:"approvedAt"`
		Number     int    `json:"number"`
		Title      string `json:"title"`
	}
	decode(t, rec, &got)
	if got.ApprovedAt == "" || got.Number != 1 || got.Title != "Entrega" {
		t.Fatalf("receipt = %+v", got)
	}
	if rec := postApprove(e, l.Token, "1", confirm); rec.Code != http.StatusConflict {
		t.Errorf("second response = %d", rec.Code)
	}

	publishNext(t, e, path, a)
	if rec := postApprove(e, l.Token, "1", confirm); rec.Code != http.StatusConflict {
		t.Errorf("superseded delivery = %d", rec.Code)
	}
}

func TestAdjustListsExposeResponsesAndPhase(t *testing.T) {
	e, _ := newAttachmentServer(t)
	a := signedUp(t, e)
	path, l := signedProject(t, e, a)
	portal := "/api/portal/" + l.Token
	type response struct {
		Kind      string `json:"kind"`
		Message   string `json:"message"`
		CreatedAt string `json:"createdAt"`
	}
	var pro struct {
		Phase       string  `json:"phase"`
		CompletedAt *string `json:"completedAt"`
		Published   []struct {
			Number   int       `json:"number"`
			Response *response `json:"response"`
		} `json:"published"`
	}
	var view struct {
		CompletedAt *string `json:"completedAt"`
		Deliveries  []struct {
			Number   int       `json:"number"`
			Response *response `json:"response"`
		} `json:"deliveries"`
	}
	phase := func() string {
		pro.Published, view.Deliveries = nil, nil
		decode(t, get(e, path+"/deliveries", a), &pro)
		decode(t, get(e, portal), &view)
		return pro.Phase
	}

	if got := phase(); got != "executing" {
		t.Fatalf("no delivery phase = %q", got)
	}
	publishNext(t, e, path, a)
	if got := phase(); got != "executing" || pro.Published[0].Response != nil || view.Deliveries[0].Response != nil {
		t.Fatalf("unanswered = %q %+v", got, pro.Published)
	}
	if rec := send(e, http.MethodPost, portal+"/deliveries/1/adjust", map[string]string{"message": "Trocar a cor do logo."}, nil); rec.Code != http.StatusNoContent {
		t.Fatalf("adjust = %d", rec.Code)
	}
	got := phase()
	r := pro.Published[0].Response
	if got != "awaiting_adjustment" || r == nil || r.Kind != "adjust" || r.Message != "Trocar a cor do logo." || r.CreatedAt == "" || view.Deliveries[0].Response == nil || *view.Deliveries[0].Response != *r {
		t.Fatalf("adjusted = %q %+v / %+v", got, pro.Published, view.Deliveries)
	}
	publishNext(t, e, path, a)
	if got := phase(); got != "executing" || pro.Published[1].Response == nil || pro.Published[0].Response != nil {
		t.Fatalf("revised = %q %+v", got, pro.Published)
	}
	if rec := postApprove(e, l.Token, "2", map[string]bool{"confirm": true}); rec.Code != http.StatusOK {
		t.Fatalf("approve = %d", rec.Code)
	}
	if got := phase(); got != "executing" || pro.Published[0].Response.Kind != "approve" {
		t.Fatalf("approved = %q %+v", got, pro.Published)
	}
}

func TestAdjustDBRestrictsResponsesAndFreezesCompleted(t *testing.T) {
	e, db := newServerDB(t)
	a := signedUp(t, e)
	filledProject(t, e, a)
	exec := func(q string) error {
		_, err := db.ExecContext(t.Context(), q)
		return err
	}
	const addDraft = `INSERT INTO deliveries (project_id) SELECT id FROM projects`
	const addFile = `INSERT INTO delivery_files (delivery_id, key, name, content_type, size) SELECT id, 'k' || id, 'a.pdf', 'application/pdf', 1 FROM deliveries WHERE published_at IS NULL`
	const publish = `UPDATE deliveries SET number = (SELECT COALESCE(MAX(number), 0) + 1 FROM deliveries), published_at = '2026-01-01T00:00:00Z' WHERE published_at IS NULL`
	const respond = `INSERT INTO delivery_responses (delivery_id, kind, message) SELECT id, 'adjust', 'Ajuste pedido' FROM deliveries WHERE number = (SELECT MAX(number) FROM deliveries)`
	const approveFirst = `INSERT INTO delivery_responses (delivery_id, kind, message) SELECT id, 'approve', '' FROM deliveries WHERE number = 1`

	if err := exec(`UPDATE projects SET status = 'signed'`); err != nil {
		t.Fatalf("mark signed: %v", err)
	}
	if err := exec(addDraft); err != nil {
		t.Fatalf("draft: %v", err)
	}
	if exec(`INSERT INTO delivery_responses (delivery_id, kind, message) SELECT id, 'adjust', 'x' FROM deliveries`) == nil {
		t.Fatal("response accepted on a draft")
	}
	for _, q := range []string{addFile, publish} {
		if err := exec(q); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	if err := exec(respond); err != nil {
		t.Fatalf("response on latest: %v", err)
	}
	if exec(respond) == nil {
		t.Error("second response accepted for one delivery")
	}
	for _, q := range []string{`UPDATE delivery_responses SET message = 'x'`, `DELETE FROM delivery_responses`} {
		if exec(q) == nil {
			t.Errorf("%s succeeded", q)
		}
	}
	for _, q := range []string{addDraft, addFile, publish, addDraft, addFile} {
		if err := exec(q); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	if exec(approveFirst) == nil {
		t.Error("response accepted on a superseded delivery")
	}
	if err := exec(`UPDATE projects SET completed_at = '2026-02-01T00:00:00Z'`); err != nil {
		t.Fatalf("complete: %v", err)
	}
	if exec(`UPDATE projects SET completed_at = NULL`) == nil {
		t.Error("completion reverted")
	}
	for _, q := range []string{
		`UPDATE stages SET status = 'in_progress'`,
		`INSERT INTO stage_files (stage_id, key, name, content_type, size) SELECT id, 'k' || id, 'a.pdf', 'application/pdf', 1 FROM stages`,
		addDraft,
		addFile,
		`DELETE FROM delivery_files WHERE delivery_id IN (SELECT id FROM deliveries WHERE published_at IS NULL)`,
		publish,
		`INSERT INTO delivery_responses (delivery_id, kind, message) SELECT id, 'approve', '' FROM deliveries WHERE number = 2`,
	} {
		if err := exec(q); err == nil || !strings.Contains(err.Error(), "completed") {
			t.Errorf("%s on completed project: %v", q, err)
		}
	}
}
