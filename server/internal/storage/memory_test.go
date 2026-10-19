package storage_test

import (
	"io"
	"strings"
	"testing"

	"github.com/ulrichheringer/pjsuite/server/internal/storage"
)

func TestMemoryRoundTrip(t *testing.T) {
	m := storage.NewMemory()
	if err := m.Put(t.Context(), "k", strings.NewReader("hello"), 5, "text/plain"); err != nil {
		t.Fatal(err)
	}
	r, err := m.Get(t.Context(), "k")
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	if got, _ := io.ReadAll(r); string(got) != "hello" {
		t.Fatalf("got %q", got)
	}
	if err := m.Delete(t.Context(), "k"); err != nil {
		t.Fatal(err)
	}
	if _, err := m.Get(t.Context(), "k"); err == nil {
		t.Fatal("Get after Delete succeeded")
	}
	if m.Len() != 0 {
		t.Fatalf("Len = %d", m.Len())
	}
}
