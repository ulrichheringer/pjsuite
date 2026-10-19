package api

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"path/filepath"
	"slices"
	"strings"

	"github.com/labstack/echo/v5"
)

const (
	maxAttachmentBytes = 20 << 20
	multipartOverhead  = 1 << 20
)

var (
	attachmentExtensions = []string{".pdf", ".jpg", ".jpeg", ".png", ".zip"}
	attachmentTypes      = []string{"application/pdf", "image/jpeg", "image/png", "application/zip"}
)

type attachment struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	ContentType string `json:"contentType"`
	Size        int64  `json:"size"`
	CreatedAt   string `json:"createdAt"`
}

func (s *server) uploadAttachment(c *echo.Context, p project) error {
	c.Request().Body = http.MaxBytesReader(c.Response(), c.Request().Body, maxAttachmentBytes+multipartOverhead)
	header, err := c.FormFile("file")
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		return echo.ErrStatusRequestEntityTooLarge
	}
	if err != nil {
		return invalid(c, http.StatusBadRequest, fieldErrors{"file": "Selecione um arquivo."})
	}
	if header.Size > maxAttachmentBytes {
		return echo.ErrStatusRequestEntityTooLarge
	}
	file, err := header.Open()
	if err != nil {
		return err
	}
	defer file.Close()
	sniff := make([]byte, 512)
	n, err := io.ReadFull(file, sniff)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) && !errors.Is(err, io.EOF) {
		return err
	}
	contentType := http.DetectContentType(sniff[:n])
	name := filepath.Base(header.Filename)
	if !slices.Contains(attachmentExtensions, strings.ToLower(filepath.Ext(name))) || !slices.Contains(attachmentTypes, contentType) {
		return invalid(c, http.StatusBadRequest, fieldErrors{"file": "Envie PDF, JPG, PNG ou ZIP."})
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return err
	}
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return err
	}
	key := hex.EncodeToString(raw)
	ctx := c.Request().Context()
	if err := s.files.Put(ctx, key, file, header.Size, contentType); err != nil {
		return err
	}
	a := attachment{Name: name, ContentType: contentType, Size: header.Size}
	err = s.db.QueryRowContext(ctx,
		`INSERT INTO attachments (project_id, key, name, content_type, size) VALUES (?, ?, ?, ?, ?) RETURNING id, created_at`,
		p.ID, key, a.Name, a.ContentType, a.Size).Scan(&a.ID, &a.CreatedAt)
	if err != nil {
		if delErr := s.files.Delete(context.WithoutCancel(ctx), key); delErr != nil {
			slog.Error("delete orphan attachment", "key", key, "err", delErr)
		}
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
