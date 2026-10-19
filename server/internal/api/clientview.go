package api

import (
	"context"
	"net/http"

	"github.com/labstack/echo/v5"
)

type clientViewParty struct {
	Name    string `json:"name"`
	Company string `json:"company,omitempty"`
	Email   string `json:"email,omitempty"`
}

type clientViewScope struct {
	Scope   string `json:"scope"`
	Outcome string `json:"outcome"`
}

type clientViewStage struct {
	Name       string `json:"name"`
	TimingKind string `json:"timingKind"`
	Timing     string `json:"timing"`
}

type clientViewDeliverable struct {
	Stage string `json:"stage"`
	Text  string `json:"text"`
}

type clientViewAttachment struct {
	Name        string `json:"name"`
	ContentType string `json:"contentType"`
	Size        int64  `json:"size"`
}

type clientView struct {
	Project      string                   `json:"project"`
	Reference    string                   `json:"reference,omitempty"`
	Professional clientViewParty          `json:"professional"`
	Client       clientViewParty          `json:"client"`
	Scope        *clientViewScope         `json:"scope,omitempty"`
	Stages       *[]clientViewStage       `json:"stages,omitempty"`
	Deliverables *[]clientViewDeliverable `json:"deliverables,omitempty"`
	Price        *paymentPlan             `json:"price,omitempty"`
	Attachments  *[]clientViewAttachment  `json:"attachments,omitempty"`
}

func (s *server) buildClientView(ctx context.Context, userID int64, p project) (clientView, error) {
	v := clientView{Project: p.Name, Reference: p.Reference, Client: clientViewParty{Name: p.ClientName}}
	err := s.db.QueryRowContext(ctx,
		`SELECT business_name, name, contact_email FROM profiles WHERE user_id = ?`, userID).Scan(&v.Professional.Company, &v.Professional.Name, &v.Professional.Email)
	if err != nil {
		return v, err
	}
	err = s.db.QueryRowContext(ctx, `SELECT company, email FROM clients WHERE id = ?`, p.ClientID).Scan(&v.Client.Company, &v.Client.Email)
	if err != nil {
		return v, err
	}
	visible, err := s.loadVisibility(ctx, p.ID)
	if err != nil {
		return v, err
	}
	if visible["scope"] {
		v.Scope = &clientViewScope{Scope: p.Scope, Outcome: p.Outcome}
	}
	if visible["stages"] || visible["deliverables"] {
		stages, err := s.loadStages(ctx, p.ID)
		if err != nil {
			return v, err
		}
		list, deliverables := []clientViewStage{}, []clientViewDeliverable{}
		for _, st := range stages {
			if !st.Visible {
				continue
			}
			list = append(list, clientViewStage{Name: st.Name, TimingKind: st.TimingKind, Timing: st.Timing})
			if st.Deliverable != "" {
				deliverables = append(deliverables, clientViewDeliverable{Stage: st.Name, Text: st.Deliverable})
			}
		}
		if visible["stages"] {
			v.Stages = &list
		}
		if visible["deliverables"] {
			v.Deliverables = &deliverables
		}
	}
	if visible["price"] {
		plan, err := s.loadPayments(ctx, p.ID)
		if err != nil {
			return v, err
		}
		v.Price = &plan
	}
	if visible["attachments"] {
		files, err := s.loadAttachments(ctx, p.ID)
		if err != nil {
			return v, err
		}
		list := make([]clientViewAttachment, len(files))
		for i, f := range files {
			list[i] = clientViewAttachment{Name: f.Name, ContentType: f.ContentType, Size: f.Size}
		}
		v.Attachments = &list
	}
	return v, nil
}

func (s *server) getClientView(c *echo.Context) error {
	p, err := s.findProject(c)
	if err != nil {
		return err
	}
	v, err := s.buildClientView(c.Request().Context(), userIDOf(c), p)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, v)
}
