package storage_test

import (
	"errors"
	"io"
	"io/fs"
	"strings"
	"testing"

	"github.com/ulrichheringer/pjsuite/server/internal/storage"
)

func TestDirRoundTrip(t *testing.T) {
	d, err := storage.NewDir(t.TempDir() + "/files")
	if err != nil {
		t.Fatal(err)
	}
	if err := d.Put(t.Context(), "abc", strings.NewReader("hello"), 5, "text/plain"); err != nil {
		t.Fatal(err)
	}
	r, err := d.Get(t.Context(), "abc")
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	if got, _ := io.ReadAll(r); string(got) != "hello" {
		t.Fatalf("got %q", got)
	}
	if err := d.Delete(t.Context(), "abc"); err != nil {
		t.Fatal(err)
	}
	if _, err := d.Get(t.Context(), "abc"); !errors.Is(err, fs.ErrNotExist) {
		t.Fatalf("Get after Delete = %v", err)
	}
	if err := d.Delete(t.Context(), "abc"); err != nil {
		t.Fatalf("Delete missing = %v", err)
	}
}

func TestDirRejectsEscapingKeys(t *testing.T) {
	d, err := storage.NewDir(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if err := d.Put(t.Context(), "../escape", strings.NewReader("x"), 1, ""); err == nil {
		t.Fatal("Put with ../ key succeeded")
	}
}

type failingReader struct{}

func (failingReader) Read([]byte) (int, error) { return 0, errors.New("boom") }

func TestDirPutRemovesPartialFileOnCopyError(t *testing.T) {
	d, err := storage.NewDir(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if err := d.Put(t.Context(), "partial", io.MultiReader(strings.NewReader("abc"), failingReader{}), 3, ""); err == nil {
		t.Fatal("Put succeeded")
	}
	if _, err := d.Get(t.Context(), "partial"); !errors.Is(err, fs.ErrNotExist) {
		t.Fatalf("Get after failed Put = %v", err)
	}
}

func TestDirGetMissingReturnsNilReader(t *testing.T) {
	d, err := storage.NewDir(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if r, err := d.Get(t.Context(), "missing"); err == nil || r != nil {
		t.Fatalf("Get missing = %v, %v", r, err)
	}
}
