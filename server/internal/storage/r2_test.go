package storage

import (
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestR2SignedURLTargetsKeyAsAttachment(t *testing.T) {
	r := NewR2("acct", "AKIAEXAMPLE", "secret", "files")
	link, err := r.SignedURL(t.Context(), "objects/abc123", "Contrato final.pdf", "application/pdf", 5*time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	u, err := url.Parse(link)
	if err != nil {
		t.Fatal(err)
	}
	if u.Host != "acct.r2.cloudflarestorage.com" && u.Host != "files.acct.r2.cloudflarestorage.com" {
		t.Fatalf("host = %q", u.Host)
	}
	if !strings.Contains(u.Path, "objects/abc123") {
		t.Fatalf("path = %q", u.Path)
	}
	q := u.Query()
	if got := q.Get("response-content-disposition"); !strings.HasPrefix(got, "attachment") || !strings.Contains(got, "Contrato final.pdf") {
		t.Fatalf("response-content-disposition = %q", got)
	}
	if got := q.Get("response-content-type"); got != "application/pdf" {
		t.Fatalf("response-content-type = %q", got)
	}
	if got := q.Get("X-Amz-Expires"); got != "300" {
		t.Fatalf("X-Amz-Expires = %q", got)
	}
}
