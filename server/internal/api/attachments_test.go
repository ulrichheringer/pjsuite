package api_test

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v5"

	"github.com/ulrichheringer/pjsuite/server/internal/storage"
)

var attachmentSamples = map[string][]byte{
	"briefing.pdf": []byte("%PDF-1.7\n%test"),
	"mood.jpg":     {0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 'J', 'F', 'I', 'F', 0},
	"mood.jpeg":    {0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 'J', 'F', 'I', 'F', 0},
	"logo.png":     {0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0},
	"pack.zip":     {'P', 'K', 3, 4, 0, 0, 0, 0},
}

type attachmentJSON struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	ContentType string `json:"contentType"`
	Size        int64  `json:"size"`
}

func newAttachmentServer(t *testing.T) (*echo.Echo, *storage.Memory) {
	t.Helper()
	e, _, files := newServerAll(t)
	return e, files
}

func upload(e *echo.Echo, path, field, name string, data []byte, cookie *http.Cookie) *httptest.ResponseRecorder {
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	part, err := w.CreateFormFile(field, name)
	if err != nil {
		panic(err)
	}
	part.Write(data)
	w.Close()
	req := httptest.NewRequest(http.MethodPost, path+"/attachments", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	if cookie != nil {
		req.AddCookie(cookie)
	}
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	return rec
}

func listAttachments(t *testing.T, e *echo.Echo, path string, cookie *http.Cookie) []attachmentJSON {
	t.Helper()
	rec := get(e, path+"/attachments", cookie)
	if rec.Code != http.StatusOK {
		t.Fatalf("list = %d %s", rec.Code, rec.Body)
	}
	var list []attachmentJSON
	decode(t, rec, &list)
	return list
}

func TestAttachmentUploadStoresObjectAndRow(t *testing.T) {
	for name, data := range attachmentSamples {
		t.Run(name, func(t *testing.T) {
			e, files := newAttachmentServer(t)
			a := signedUp(t, e)
			path := blankProject(t, e, a)
			rec := upload(e, path, "file", name, data, a)
			if rec.Code != http.StatusCreated {
				t.Fatalf("upload = %d %s", rec.Code, rec.Body)
			}
			var got attachmentJSON
			decode(t, rec, &got)
			if got.Name != name || got.Size != int64(len(data)) || got.ID == 0 {
				t.Fatalf("attachment = %+v", got)
			}
			if files.Len() != 1 {
				t.Fatalf("objects = %d", files.Len())
			}
			if list := listAttachments(t, e, path, a); len(list) != 1 || list[0] != got {
				t.Fatalf("list = %+v, want [%+v]", list, got)
			}
		})
	}
}
