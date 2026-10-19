package api_test

import (
	"net/http"
	"reflect"
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
