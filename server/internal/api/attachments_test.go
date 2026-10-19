package api_test

import (
	"bytes"
	"mime"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
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

func TestAttachmentUploadRejections(t *testing.T) {
	pdf := attachmentSamples["briefing.pdf"]
	tests := []struct {
		name   string
		file   string
		field  string
		data   []byte
		status int
	}{
		{"too large", "big.zip", "file", append([]byte{'P', 'K', 3, 4}, make([]byte, 20<<20)...), http.StatusRequestEntityTooLarge},
		{"bad extension", "notes.txt", "file", pdf, http.StatusBadRequest},
		{"no extension", "notes", "file", pdf, http.StatusBadRequest},
		{"sniffed type mismatch", "fake.pdf", "file", []byte("just text"), http.StatusBadRequest},
		{"wrong field", "briefing.pdf", "doc", pdf, http.StatusBadRequest},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			e, files := newAttachmentServer(t)
			a := signedUp(t, e)
			path := blankProject(t, e, a)
			rec := upload(e, path, tc.field, tc.file, tc.data, a)
			if rec.Code != tc.status {
				t.Fatalf("status = %d, want %d: %.200s", rec.Code, tc.status, rec.Body)
			}
			if tc.status == http.StatusBadRequest && !strings.Contains(rec.Body.String(), `"errors"`) {
				t.Fatalf("body = %s", rec.Body)
			}
			if files.Len() != 0 || len(listAttachments(t, e, path, a)) != 0 {
				t.Fatal("rejected upload left data behind")
			}
		})
	}
}

func TestAttachmentUploadScopedAndWritable(t *testing.T) {
	e, files := newAttachmentServer(t)
	a := signedUp(t, e)
	b := signedUpAs(t, e, "bruno@example.com")
	path := blankProject(t, e, a)
	pdf := attachmentSamples["briefing.pdf"]
	if rec := upload(e, path, "file", "briefing.pdf", pdf, b); rec.Code != http.StatusNotFound {
		t.Fatalf("other user = %d", rec.Code)
	}
	if rec := send(e, http.MethodPost, path+"/archive", nil, a); rec.Code != http.StatusNoContent {
		t.Fatalf("archive = %d", rec.Code)
	}
	if rec := upload(e, path, "file", "briefing.pdf", pdf, a); rec.Code != http.StatusConflict {
		t.Fatalf("archived = %d", rec.Code)
	}
	if files.Len() != 0 {
		t.Fatal("rejected upload left data behind")
	}
}

func TestAttachmentDownloadStreamsOriginalBytes(t *testing.T) {
	e, _ := newAttachmentServer(t)
	a := signedUp(t, e)
	b := signedUpAs(t, e, "bruno@example.com")
	path := blankProject(t, e, a)
	data := attachmentSamples["briefing.pdf"]
	var created attachmentJSON
	decode(t, upload(e, path, "file", "briefing.pdf", data, a), &created)
	url := path + "/attachments/" + strconv.Itoa(created.ID)
	rec := get(e, url, a)
	if rec.Code != http.StatusOK || !bytes.Equal(rec.Body.Bytes(), data) {
		t.Fatalf("download = %d %q", rec.Code, rec.Body)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/pdf" {
		t.Fatalf("Content-Type = %q", got)
	}
	kind, params, err := mime.ParseMediaType(rec.Header().Get("Content-Disposition"))
	if err != nil || kind != "attachment" || params["filename"] != "briefing.pdf" {
		t.Fatalf("Content-Disposition = %q", rec.Header().Get("Content-Disposition"))
	}
	if got := rec.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("X-Content-Type-Options = %q", got)
	}
	if rec := get(e, url, b); rec.Code != http.StatusNotFound {
		t.Fatalf("other user = %d", rec.Code)
	}
	if rec := get(e, path+"/attachments", b); rec.Code != http.StatusNotFound {
		t.Fatalf("other user list = %d", rec.Code)
	}
	if rec := get(e, path+"/attachments/999", a); rec.Code != http.StatusNotFound {
		t.Fatalf("missing = %d", rec.Code)
	}
}
