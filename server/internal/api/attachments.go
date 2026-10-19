package api

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"io"
	"io/fs"
	"log/slog"
	"mime"
	"net/http"
	"path/filepath"
	"slices"
	"strconv"
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

func (s *server) findAttachment(c *echo.Context, p project) (a attachment, key string, err error) {
	id, err := strconv.ParseInt(c.Param("aid"), 10, 64)
	if err != nil {
		return a, "", echo.ErrNotFound
	}
	err = s.db.QueryRowContext(c.Request().Context(),
		`SELECT id, key, name, content_type, size, created_at FROM attachments WHERE id = ? AND project_id = ?`, id, p.ID).
		Scan(&a.ID, &key, &a.Name, &a.ContentType, &a.Size, &a.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return a, "", echo.ErrNotFound
	}
	return a, key, err
}

func (s *server) downloadAttachment(c *echo.Context) error {
	p, err := s.findProject(c)
	if err != nil {
		return err
	}
	a, key, err := s.findAttachment(c, p)
	if err != nil {
		return err
	}
	object, err := s.files.Get(c.Request().Context(), key)
	if errors.Is(err, fs.ErrNotExist) {
		return echo.ErrNotFound
	}
	if err != nil {
		return err
	}
	defer object.Close()
	h := c.Response().Header()
	h.Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": a.Name}))
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Content-Length", strconv.FormatInt(a.Size, 10))
	return c.Stream(http.StatusOK, a.ContentType, object)
}

func (s *server) deleteAttachment(c *echo.Context, p project) error {
	a, key, err := s.findAttachment(c, p)
	if err != nil {
		return err
	}
	ctx := c.Request().Context()
	if _, err := s.db.ExecContext(ctx, `DELETE FROM attachments WHERE id = ?`, a.ID); err != nil {
		return err
	}
	if err := s.files.Delete(context.WithoutCancel(ctx), key); err != nil {
		slog.Error("delete attachment object", "key", key, "err", err)
	}
	return c.NoContent(http.StatusNoContent)
}
