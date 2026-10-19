package api_test

import (
	"net/http"
	"reflect"
	"strconv"
	"strings"
	"testing"

	"github.com/labstack/echo/v5"
)

type paymentPlan struct {
	PriceCents int64 `json:"priceCents"`
	Payments   []map[string]any
}

func getPayments(t *testing.T, e *echo.Echo, path string, cookie *http.Cookie) paymentPlan {
	t.Helper()
	rec := get(e, path+"/payments", cookie)
	if rec.Code != http.StatusOK {
		t.Fatalf("get payments = %d %s", rec.Code, rec.Body)
	}
	var plan paymentPlan
	decode(t, rec, &plan)
	return plan
}

func TestPaymentsSeededByStructure(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	client := clientID(t, e, a, "Ana")
	for _, structure := range []string{"essential", "suggested"} {
		path := createdProject(t, e, a, map[string]any{"name": "Ensaio", "clientId": client, "structure": structure})
		want := []map[string]any{
			{"kind": "entrada", "percent": 30.0, "trigger": "assinatura", "due": "Na assinatura do contrato"},
			{"kind": "saldo", "percent": 70.0, "trigger": "antes_entrega", "due": "Antes da publicação final"},
		}
		if got := getPayments(t, e, path, a); got.PriceCents != 0 || !reflect.DeepEqual(got.Payments, want) {
			t.Fatalf("%s plan = %+v", structure, got)
		}
	}
	got := getPayments(t, e, blankProject(t, e, a), a)
	if got.PriceCents != 0 || got.Payments == nil || len(got.Payments) != 0 {
		t.Fatalf("blank plan = %+v", got)
	}
	if rec := get(e, "/api/projects/999999/payments", a); rec.Code != http.StatusNotFound {
		t.Fatalf("missing = %d", rec.Code)
	}
}

func pay(kind string, percent int, trigger, due string) map[string]any {
	return map[string]any{"kind": kind, "percent": percent, "trigger": trigger, "due": due}
}

func TestPaymentsPutReplacesPlanInOrder(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := blankProject(t, e, a)
	body := map[string]any{"priceCents": 150000, "payments": []map[string]any{
		pay("entrada", 35, "assinatura", "Hoje"),
		pay("parcela", 35, "data", "10 nov"),
		pay("saldo", 30, "antes_entrega", ""),
	}}
	if rec := send(e, http.MethodPut, path+"/payments", body, a); rec.Code != http.StatusNoContent {
		t.Fatalf("PUT = %d %s", rec.Code, rec.Body)
	}
	got := getPayments(t, e, path, a)
	if got.PriceCents != 150000 || len(got.Payments) != 3 || got.Payments[0]["kind"] != "entrada" || got.Payments[1]["due"] != "10 nov" || got.Payments[2]["percent"] != 30.0 {
		t.Fatalf("plan = %+v", got)
	}

	if rec := send(e, http.MethodPut, path+"/payments", map[string]any{"priceCents": 0, "payments": []map[string]any{pay("unico", 100, "assinatura", "")}}, a); rec.Code != http.StatusNoContent {
		t.Fatalf("second PUT = %d", rec.Code)
	}
	if got := getPayments(t, e, path, a); got.PriceCents != 0 || len(got.Payments) != 1 {
		t.Fatalf("replaced plan = %+v", got)
	}
}

func TestPaymentsPutValidates(t *testing.T) {
	twelve := make([]map[string]any, 13)
	for i := range twelve {
		twelve[i] = pay("parcela", 0, "data", "")
	}
	tests := []struct {
		name     string
		price    int64
		payments []map[string]any
		field    string
	}{
		{"negative price", -1, nil, "priceCents"},
		{"price above limit", 1_000_000_001, nil, "priceCents"},
		{"bad kind", 0, []map[string]any{pay("mensal", 50, "data", "")}, "payments"},
		{"bad trigger", 0, []map[string]any{pay("entrada", 50, "nunca", "")}, "payments"},
		{"percent not step of 5", 0, []map[string]any{pay("entrada", 33, "data", "")}, "payments"},
		{"percent above 100", 0, []map[string]any{pay("entrada", 105, "data", "")}, "payments"},
		{"percent negative", 0, []map[string]any{pay("entrada", -5, "data", "")}, "payments"},
		{"sum above 100", 0, []map[string]any{pay("entrada", 60, "data", ""), pay("saldo", 45, "data", "")}, "payments"},
		{"too many", 0, twelve, "payments"},
		{"due too long", 0, []map[string]any{pay("entrada", 50, "data", strings.Repeat("é", 201))}, "payments"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e := newServer(t)
			a := signedUp(t, e)
			path := blankProject(t, e, a)
			rec := send(e, http.MethodPut, path+"/payments", map[string]any{"priceCents": tt.price, "payments": tt.payments}, a)
			var got struct{ Errors map[string]string }
			decode(t, rec, &got)
			if rec.Code != http.StatusBadRequest || got.Errors[tt.field] == "" {
				t.Fatalf("PUT = %d %s", rec.Code, rec.Body)
			}
			if plan := getPayments(t, e, path, a); len(plan.Payments) != 0 || plan.PriceCents != 0 {
				t.Fatalf("plan changed: %+v", plan)
			}
		})
	}
}

func TestPaymentsPutAcceptsFullAndPartialPlans(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := blankProject(t, e, a)
	for _, payments := range [][]map[string]any{nil, {pay("entrada", 30, "assinatura", "")}, {pay("unico", 100, "assinatura", "")}} {
		if rec := send(e, http.MethodPut, path+"/payments", map[string]any{"priceCents": 1_000_000_000, "payments": payments}, a); rec.Code != http.StatusNoContent {
			t.Fatalf("PUT %v = %d %s", payments, rec.Code, rec.Body)
		}
	}
}

func TestPaymentsPutScopedAndWritable(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	b := signedUpAs(t, e, "bruno@example.com")
	path := blankProject(t, e, a)
	body := map[string]any{"priceCents": 100, "payments": []map[string]any{pay("unico", 100, "assinatura", "")}}
	if rec := send(e, http.MethodPut, path+"/payments", body, b); rec.Code != http.StatusNotFound {
		t.Fatalf("other user PUT = %d", rec.Code)
	}
	if rec := get(e, path+"/payments", b); rec.Code != http.StatusNotFound {
		t.Fatalf("other user GET = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, path+"/archive", nil, a); rec.Code != http.StatusNoContent {
		t.Fatalf("archive = %d", rec.Code)
	}
	if rec := send(e, http.MethodPut, path+"/payments", body, a); rec.Code != http.StatusConflict {
		t.Fatalf("archived PUT = %d", rec.Code)
	}
}

func TestPaymentsDuplicateCopiesPlan(t *testing.T) {
	e := newServer(t)
	a := signedUp(t, e)
	path := blankProject(t, e, a)
	body := map[string]any{"priceCents": 987654, "payments": []map[string]any{pay("entrada", 40, "data", "10 nov"), pay("saldo", 60, "antes_entrega", "Final")}}
	if rec := send(e, http.MethodPut, path+"/payments", body, a); rec.Code != http.StatusNoContent {
		t.Fatalf("PUT = %d", rec.Code)
	}
	var copied struct{ ID int }
	rec := send(e, http.MethodPost, path+"/duplicate", nil, a)
	decode(t, rec, &copied)
	copyPath := "/api/projects/" + strconv.Itoa(copied.ID)
	if want, got := getPayments(t, e, path, a), getPayments(t, e, copyPath, a); !reflect.DeepEqual(want, got) || len(got.Payments) != 2 {
		t.Fatalf("copy plan = %+v, want %+v", got, want)
	}
}
