package api

import (
	"context"
	"database/sql"
	"net/http"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/labstack/echo/v5"
)

const (
	maxPriceCents      = 1_000_000_000
	maxPayments        = 12
	maxPaymentDueRunes = 200
)

var (
	paymentKinds    = []string{"entrada", "parcela", "saldo", "unico"}
	paymentTriggers = []string{"assinatura", "data", "etapa", "antes_entrega", "apos_aprovacao"}
)

type payment struct {
	Kind    string `json:"kind"`
	Percent int    `json:"percent"`
	Trigger string `json:"trigger"`
	Due     string `json:"due"`
}

type paymentPlan struct {
	PriceCents int64     `json:"priceCents"`
	Payments   []payment `json:"payments"`
}

var starterPayments = []payment{
	{Kind: "entrada", Percent: 30, Trigger: "assinatura", Due: "Na assinatura do contrato"},
	{Kind: "saldo", Percent: 70, Trigger: "antes_entrega", Due: "Antes da publicação final"},
}

func insertPayments(ctx context.Context, tx *sql.Tx, projectID int64, payments []payment) error {
	for i, pay := range payments {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO payments (project_id, position, kind, percent, trigger, due) VALUES (?, ?, ?, ?, ?, ?)`,
			projectID, i+1, pay.Kind, pay.Percent, pay.Trigger, pay.Due); err != nil {
			return err
		}
	}
	return nil
}

func (s *server) loadPayments(ctx context.Context, projectID int64) (paymentPlan, error) {
	plan := paymentPlan{Payments: []payment{}}
	if err := s.db.QueryRowContext(ctx, `SELECT price_cents FROM projects WHERE id = ?`, projectID).Scan(&plan.PriceCents); err != nil {
		return plan, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT kind, percent, trigger, due FROM payments WHERE project_id = ? ORDER BY position`, projectID)
	if err != nil {
		return plan, err
	}
	defer rows.Close()
	for rows.Next() {
		var pay payment
		if err := rows.Scan(&pay.Kind, &pay.Percent, &pay.Trigger, &pay.Due); err != nil {
			return plan, err
		}
		plan.Payments = append(plan.Payments, pay)
	}
	return plan, rows.Err()
}

func (s *server) listPayments(c *echo.Context) error {
	p, err := s.findProject(c)
	if err != nil {
		return err
	}
	plan, err := s.loadPayments(c.Request().Context(), p.ID)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, plan)
}

func (in paymentPlan) validate() fieldErrors {
	errs := fieldErrors{}
	if in.PriceCents < 0 || in.PriceCents > maxPriceCents {
		errs["priceCents"] = "Informe um valor entre R$ 0 e R$ 10.000.000."
	}
	total := 0
	for _, pay := range in.Payments {
		total += pay.Percent
		switch {
		case !slices.Contains(paymentKinds, pay.Kind), !slices.Contains(paymentTriggers, pay.Trigger):
			errs["payments"] = "Escolha o tipo e a cobrança de cada pagamento."
		case pay.Percent < 0 || pay.Percent > 100 || pay.Percent%5 != 0:
			errs["payments"] = "Use percentuais de 0 a 100, de 5 em 5."
		case utf8.RuneCountInString(pay.Due) > maxPaymentDueRunes:
			errs["payments"] = "Use até 200 caracteres na data ou condição."
		}
	}
	switch {
	case errs["payments"] != "":
	case len(in.Payments) > maxPayments:
		errs["payments"] = "Use até 12 pagamentos."
	case total > 100:
		errs["payments"] = "A soma dos percentuais passa de 100%."
	}
	return errs
}

func (s *server) putPayments(c *echo.Context, p project) error {
	var in paymentPlan
	if err := c.Bind(&in); err != nil {
		return echo.ErrBadRequest
	}
	for i := range in.Payments {
		in.Payments[i].Due = strings.TrimSpace(in.Payments[i].Due)
	}
	if errs := in.validate(); len(errs) > 0 {
		return invalid(c, http.StatusBadRequest, errs)
	}
	err := s.inTx(c, func(ctx context.Context, tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `UPDATE projects SET price_cents = ? WHERE id = ?`, in.PriceCents, p.ID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM payments WHERE project_id = ?`, p.ID); err != nil {
			return err
		}
		return insertPayments(ctx, tx, p.ID, in.Payments)
	})
	if err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
