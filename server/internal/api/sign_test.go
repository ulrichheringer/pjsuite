package api_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v5"
)

func TestSignDBRejectsChangesToVersionsAndSignatures(t *testing.T) {
	e, db := newServerDB(t)
	a := signedUp(t, e)
	path := filledProject(t, e, a)
	if rec := send(e, http.MethodPost, path+"/contract", nil, a); rec.Code != http.StatusCreated {
		t.Fatalf("finalize = %d", rec.Code)
	}
	if _, err := db.ExecContext(t.Context(),
		`INSERT INTO signatures (project_id, version, name, email, ip, user_agent, hash) SELECT project_id, number, 'Ana', 'ana@example.com', '1.1.1.1', 'ua', hash FROM contract_versions`); err != nil {
		t.Fatalf("insert signature: %v", err)
	}

	for _, q := range []string{
		`UPDATE contract_versions SET note = 'x'`,
		`DELETE FROM contract_versions`,
		`UPDATE signatures SET name = 'x'`,
		`DELETE FROM signatures`,
	} {
		if _, err := db.ExecContext(t.Context(), q); err == nil {
			t.Errorf("%s succeeded", q)
		}
	}
	if _, err := db.ExecContext(t.Context(), `DELETE FROM projects`); err != nil {
		t.Fatalf("project delete cascade: %v", err)
	}
	var left int
	if err := db.QueryRowContext(t.Context(), `SELECT (SELECT COUNT(*) FROM contract_versions) + (SELECT COUNT(*) FROM signatures)`).Scan(&left); err != nil || left != 0 {
		t.Fatalf("left = %d err = %v", left, err)
	}
}

func TestSignRevisionPublishesNextVersionOnSameLink(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, l := finalizedShare(t, e, a)
	if rec := send(e, http.MethodPost, "/api/portal/"+l.Token+"/change", map[string]string{"message": "Trocar prazo"}, nil); rec.Code != http.StatusNoContent {
		t.Fatalf("change = %d", rec.Code)
	}
	if rec := send(e, http.MethodPut, path+"/builder", map[string]any{"scope": "Escopo revisado"}, a); rec.Code != http.StatusNoContent {
		t.Fatalf("edit = %d", rec.Code)
	}
	v1 := get(e, path+"/contract/1", a).Body.String()

	for _, note := range []string{"", "   ", strings.Repeat("a", 4001)} {
		if rec := send(e, http.MethodPost, path+"/contract/revision", map[string]string{"note": note}, a); rec.Code != http.StatusBadRequest {
			t.Errorf("note of %d bytes = %d", len(note), rec.Code)
		}
	}
	rec := send(e, http.MethodPost, path+"/contract/revision", map[string]string{"note": "Prazo ajustado"}, a)
	if rec.Code != http.StatusCreated {
		t.Fatalf("revision = %d %s", rec.Code, rec.Body)
	}
	var v2 struct {
		contractJSON
		Note string `json:"note"`
	}
	decode(t, rec, &v2)
	if v2.Number != 2 || v2.Note != "Prazo ajustado" || len(v2.Hash) != 64 || !strings.Contains(rec.Body.String(), "Escopo revisado") {
		t.Fatalf("v2 = %s", rec.Body)
	}
	if got := get(e, path+"/contract/1", a).Body.String(); got != v1 {
		t.Fatal("v1 changed")
	}
	var p map[string]any
	decode(t, get(e, path, a), &p)
	if p["status"] != "sent" {
		t.Fatalf("status = %v", p["status"])
	}
	var again shareJSON
	decode(t, get(e, path+"/share", a), &again)
	if again.Token != l.Token {
		t.Fatal("link changed")
	}

	if rec := send(e, http.MethodPost, path+"/contract/revision", map[string]string{"note": "x"}, signedUpAs(t, e, "bruno@example.com")); rec.Code != http.StatusNotFound {
		t.Errorf("other user = %d", rec.Code)
	}
}

func TestSignRevisionRejectsDraftAndRefused(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	draft := filledProject(t, e, a)
	if rec := send(e, http.MethodPost, draft+"/contract/revision", map[string]string{"note": "x"}, a); rec.Code != http.StatusConflict {
		t.Errorf("draft = %d", rec.Code)
	}
	path, l := finalizedShare(t, e, a)
	if rec := send(e, http.MethodPost, "/api/portal/"+l.Token+"/refuse", map[string]string{"reason": ""}, nil); rec.Code != http.StatusNoContent {
		t.Fatalf("refuse = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, path+"/contract/revision", map[string]string{"note": "x"}, a); rec.Code != http.StatusConflict {
		t.Errorf("refused = %d", rec.Code)
	}
}

func TestSignPortalServesLatestVersionAndRecordsChangeAgainstIt(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, l := finalizedShare(t, e, a)
	if rec := send(e, http.MethodPut, path+"/builder", map[string]any{"scope": "Escopo revisado"}, a); rec.Code != http.StatusNoContent {
		t.Fatalf("edit = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, path+"/contract/revision", map[string]string{"note": "Ajuste"}, a); rec.Code != http.StatusCreated {
		t.Fatalf("revision = %d", rec.Code)
	}
	rec := get(e, "/api/portal/"+l.Token)
	var view portalJSON
	decode(t, rec, &view)
	if view.Version != 2 || view.Status != "viewed" || !strings.Contains(rec.Body.String(), "Escopo revisado") {
		t.Fatalf("portal = %s", rec.Body)
	}
	if rec := send(e, http.MethodPost, "/api/portal/"+l.Token+"/change", map[string]string{"message": "Mais uma"}, nil); rec.Code != http.StatusNoContent {
		t.Fatalf("change = %d", rec.Code)
	}
	var share shareJSON
	decode(t, get(e, path+"/share", a), &share)
	if share.Request == nil || share.Request.Version != 2 {
		t.Fatalf("share = %+v", share)
	}
}

func signBody(version int) map[string]any {
	return map[string]any{"version": version, "name": "Ana Souza", "email": "ana@example.com", "consent": true}
}

func TestSignRecordsReceiptAndMarksSigned(t *testing.T) {
	e, db := newServerDB(t)
	a := signedUp(t, e)
	path, l := finalizedShare(t, e, a)
	portal := "/api/portal/" + l.Token

	req := httptest.NewRequest(http.MethodPost, portal+"/sign", strings.NewReader(`{"version":1,"name":"  Ana Souza ","email":"ana@example.com","consent":true}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "TestAgent/1.0")
	req.RemoteAddr = "203.0.113.9:4444"
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("sign = %d %s", rec.Code, rec.Body)
	}

	var ip, ua, hash, name string
	if err := db.QueryRowContext(t.Context(), `SELECT ip, user_agent, hash, name FROM signatures`).Scan(&ip, &ua, &hash, &name); err != nil {
		t.Fatal(err)
	}
	var v1 contractJSON
	decode(t, get(e, path+"/contract/1", a), &v1)
	if ip != "203.0.113.9" || ua != "TestAgent/1.0" || hash != v1.Hash || name != "Ana Souza" {
		t.Fatalf("stored = %q %q %q %q", ip, ua, hash, name)
	}

	var view struct {
		Status    string `json:"status"`
		Signature *struct {
			Name     string `json:"name"`
			Email    string `json:"email"`
			Version  int    `json:"version"`
			Hash     string `json:"hash"`
			SignedAt string `json:"signedAt"`
		} `json:"signature"`
	}
	portalRec := get(e, portal)
	decode(t, portalRec, &view)
	s := view.Signature
	if view.Status != "signed" || s == nil || s.Name != "Ana Souza" || s.Email != "ana@example.com" || s.Version != 1 || s.Hash != v1.Hash || s.SignedAt == "" {
		t.Fatalf("portal = %s", portalRec.Body)
	}
	var p map[string]any
	decode(t, get(e, path, a), &p)
	if p["status"] != "signed" {
		t.Fatalf("status = %v", p["status"])
	}
}

func TestSignRejectsInvalidRequests(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, l := finalizedShare(t, e, a)
	sign := "/api/portal/" + l.Token + "/sign"

	cases := []struct {
		name   string
		mutate func(m map[string]any)
	}{
		{"no consent", func(m map[string]any) { m["consent"] = false }},
		{"no name", func(m map[string]any) { m["name"] = "  " }},
		{"bad email", func(m map[string]any) { m["email"] = "ana@" }},
		{"display email", func(m map[string]any) { m["email"] = "Ana <ana@example.com>" }},
	}
	for _, tc := range cases {
		body := signBody(1)
		tc.mutate(body)
		if rec := send(e, http.MethodPost, sign, body, nil); rec.Code != http.StatusBadRequest {
			t.Errorf("%s = %d", tc.name, rec.Code)
		}
	}

	if rec := send(e, http.MethodPost, "/api/portal/nope/sign", signBody(1), nil); rec.Code != http.StatusNotFound {
		t.Errorf("bad token = %d", rec.Code)
	}

	send(e, http.MethodPut, path+"/builder", map[string]any{"scope": "Novo"}, a)
	send(e, http.MethodPost, path+"/contract/revision", map[string]string{"note": "Ajuste"}, a)
	rec := send(e, http.MethodPost, sign, signBody(1), nil)
	if rec.Code != http.StatusConflict || strings.TrimSpace(rec.Body.String()) != `{"error":"stale_version"}` {
		t.Fatalf("stale = %d %s", rec.Code, rec.Body)
	}

	if rec := send(e, http.MethodPost, sign, signBody(2), nil); rec.Code != http.StatusOK {
		t.Fatalf("sign = %d %s", rec.Code, rec.Body)
	}
	if rec := send(e, http.MethodPost, sign, signBody(2), nil); rec.Code != http.StatusConflict {
		t.Errorf("second sign = %d", rec.Code)
	}
}

func TestSignRejectsRefusedContract(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	_, l := finalizedShare(t, e, a)
	if rec := send(e, http.MethodPost, "/api/portal/"+l.Token+"/refuse", map[string]string{"reason": ""}, nil); rec.Code != http.StatusNoContent {
		t.Fatalf("refuse = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, "/api/portal/"+l.Token+"/sign", signBody(1), nil); rec.Code != http.StatusConflict {
		t.Errorf("sign refused = %d", rec.Code)
	}
}

func signedProject(t *testing.T, e *echo.Echo, a *http.Cookie) (string, shareJSON) {
	t.Helper()
	path, l := finalizedShare(t, e, a)
	if rec := send(e, http.MethodPost, "/api/portal/"+l.Token+"/sign", signBody(1), nil); rec.Code != http.StatusOK {
		t.Fatalf("sign = %d %s", rec.Code, rec.Body)
	}
	return path, l
}

func TestSignFreezesEveryBuilderWrite(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, l := signedProject(t, e, a)
	portal := "/api/portal/" + l.Token

	writes := []struct {
		method, suffix string
		body           any
	}{
		{http.MethodPut, "", map[string]any{"name": "Novo", "clientId": 1}},
		{http.MethodPut, "/builder", map[string]any{"scope": "Novo"}},
		{http.MethodPut, "/visibility", map[string]bool{"scope": false}},
		{http.MethodPut, "/payments", map[string]any{"priceCents": 1, "payments": []map[string]any{}}},
		{http.MethodPost, "/stages", map[string]any{"name": "Nova", "timingKind": "none"}},
		{http.MethodPut, "/stages/order", map[string]any{"ids": []int{1}}},
		{http.MethodPut, "/stages/1", map[string]any{"name": "Nova", "timingKind": "none"}},
		{http.MethodDelete, "/stages/1", nil},
		{http.MethodDelete, "/attachments/1", nil},
		{http.MethodPost, "/contract", nil},
		{http.MethodPost, "/contract/revision", map[string]string{"note": "x"}},
		{http.MethodPost, "/share", nil},
		{http.MethodPost, "/share/regenerate", nil},
	}
	for _, w := range writes {
		if rec := send(e, w.method, path+w.suffix, w.body, a); rec.Code != http.StatusConflict {
			t.Errorf("%s %s = %d", w.method, w.suffix, rec.Code)
		}
	}
	if rec := upload(e, path, "file", "outro.pdf", attachmentSamples["briefing.pdf"], a); rec.Code != http.StatusConflict {
		t.Errorf("upload = %d", rec.Code)
	}
	var frozen struct {
		Errors map[string]string `json:"errors"`
	}
	decode(t, send(e, http.MethodPut, path+"/builder", map[string]any{"scope": "Novo"}, a), &frozen)
	if frozen.Errors["signed"] != "Contrato assinado não pode ser alterado." {
		t.Errorf("errors = %v", frozen.Errors)
	}
	if rec := send(e, http.MethodPost, portal+"/change", map[string]string{"message": "Mudar"}, nil); rec.Code != http.StatusConflict {
		t.Errorf("change = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, portal+"/refuse", map[string]string{"reason": ""}, nil); rec.Code != http.StatusConflict {
		t.Errorf("refuse = %d", rec.Code)
	}
	var p map[string]any
	decode(t, get(e, path, a), &p)
	if p["status"] != "signed" {
		t.Fatalf("status = %v", p["status"])
	}
}

func TestSignPortalHidesIPAndUserAgent(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	_, l := finalizedShare(t, e, a)
	req := httptest.NewRequest(http.MethodPost, "/api/portal/"+l.Token+"/sign", strings.NewReader(`{"version":1,"name":"Ana","email":"ana@example.com","consent":true}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "SECRET-AGENT/9")
	req.RemoteAddr = "198.51.100.7:1234"
	signed := httptest.NewRecorder()
	e.ServeHTTP(signed, req)
	if signed.Code != http.StatusOK {
		t.Fatalf("sign = %d", signed.Code)
	}
	for _, body := range []string{signed.Body.String(), get(e, "/api/portal/"+l.Token).Body.String()} {
		for _, secret := range []string{"SECRET-AGENT", "198.51.100.7"} {
			if strings.Contains(body, secret) {
				t.Errorf("leaked %q in %s", secret, body)
			}
		}
	}
}

func TestSignDuplicateDropsContractLinkAndSignature(t *testing.T) {
	e, db := newServerDB(t)
	a := signedUp(t, e)
	path, _ := signedProject(t, e, a)
	var copied map[string]any
	rec := send(e, http.MethodPost, path+"/duplicate", nil, a)
	decode(t, rec, &copied)
	if rec.Code != http.StatusCreated || copied["status"] != "draft" {
		t.Fatalf("copy = %d %v", rec.Code, copied)
	}
	var versions, signatures, links int
	err := db.QueryRowContext(t.Context(),
		`SELECT (SELECT COUNT(*) FROM contract_versions WHERE project_id = ?), (SELECT COUNT(*) FROM signatures WHERE project_id = ?), (SELECT COUNT(*) FROM share_links WHERE project_id = ?)`,
		copied["id"], copied["id"], copied["id"]).Scan(&versions, &signatures, &links)
	if err != nil || versions+signatures+links != 0 {
		t.Fatalf("copy has %d versions %d signatures %d links (%v)", versions, signatures, links, err)
	}
}

func TestSignContractListShowsVersionsAndSignature(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path, l := finalizedShare(t, e, a)

	var empty struct {
		Versions  []map[string]any `json:"versions"`
		Signature *receipt         `json:"signature"`
	}
	rec := get(e, path+"/contract", a)
	decode(t, rec, &empty)
	if rec.Code != http.StatusOK || len(empty.Versions) != 1 || empty.Signature != nil {
		t.Fatalf("list = %d %s", rec.Code, rec.Body)
	}
	if rec := send(e, http.MethodPost, path+"/contract/revision", map[string]string{"note": "Ajuste"}, a); rec.Code != http.StatusCreated {
		t.Fatalf("revision = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, "/api/portal/"+l.Token+"/sign", signBody(2), nil); rec.Code != http.StatusOK {
		t.Fatalf("sign = %d", rec.Code)
	}

	rec = get(e, path+"/contract", a)
	var list struct {
		Versions []struct {
			Number    int    `json:"number"`
			Hash      string `json:"hash"`
			Note      string `json:"note"`
			CreatedAt string `json:"createdAt"`
		} `json:"versions"`
		Signature *receipt `json:"signature"`
	}
	decode(t, rec, &list)
	if len(list.Versions) != 2 || list.Versions[0].Number != 2 || list.Versions[0].Note != "Ajuste" || list.Versions[1].Number != 1 || len(list.Versions[1].Hash) != 64 || list.Versions[1].CreatedAt == "" {
		t.Fatalf("versions = %s", rec.Body)
	}
	if list.Signature == nil || list.Signature.Version != 2 || list.Signature.Name != "Ana Souza" {
		t.Fatalf("signature = %s", rec.Body)
	}
	for _, leak := range []string{"content", "\"ip\"", "userAgent"} {
		if strings.Contains(rec.Body.String(), leak) {
			t.Errorf("list leaks %q", leak)
		}
	}
	if rec := get(e, path+"/contract", signedUpAs(t, e, "bruno@example.com")); rec.Code != http.StatusNotFound {
		t.Errorf("other user = %d", rec.Code)
	}
}
