package api

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"path/filepath"

	"github.com/labstack/echo/v5"
)

type attachment struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	ContentType string `json:"contentType"`
	Size        int64  `json:"size"`
	CreatedAt   string `json:"createdAt"`
}

func (s *server) uploadAttachment(c *echo.Context, p project) error {
	header, err := c.FormFile("file")
	if err != nil {
		return echo.ErrBadRequest
	}
	file, err := header.Open()
	if err != nil {
		return err
	}
	defer file.Close()
	sniff := make([]byte, 512)
	n, _ := file.Read(sniff)
	contentType := http.DetectContentType(sniff[:n])
	if _, err := file.Seek(0, 0); err != nil {
		return err
	}
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return err
	}
	key := hex.EncodeToString(raw)
	name := filepath.Base(header.Filename)
	ctx := c.Request().Context()
	if err := s.files.Put(ctx, key, file, header.Size, contentType); err != nil {
		return err
	}
	a := attachment{Name: name, ContentType: contentType, Size: header.Size}
	err = s.db.QueryRowContext(ctx,
		`INSERT INTO attachments (project_id, key, name, content_type, size) VALUES (?, ?, ?, ?, ?) RETURNING id, created_at`,
		p.ID, key, a.Name, a.ContentType, a.Size).Scan(&a.ID, &a.CreatedAt)
	if err != nil {
		s.files.Delete(context.WithoutCancel(ctx), key)
		return err
	}
	return c.JSON(http.StatusCreated, a)
}

func (s *server) listAttachments(c *echo.Context) error {
	p, err := s.findProject(c)
	if err != nil {
		return err
	}
	rows, err := s.db.QueryContext(c.Request().Context(),
		`SELECT id, name, content_type, size, created_at FROM attachments WHERE project_id = ? ORDER BY id`, p.ID)
	if err != nil {
		return err
	}
	defer rows.Close()
	list := []attachment{}
	for rows.Next() {
		var a attachment
		if err := rows.Scan(&a.ID, &a.Name, &a.ContentType, &a.Size, &a.CreatedAt); err != nil {
			return err
		}
		list = append(list, a)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, list)
}
