package api

import (
	"context"
	"database/sql"
	"net/http"

	"github.com/labstack/echo/v5"
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
