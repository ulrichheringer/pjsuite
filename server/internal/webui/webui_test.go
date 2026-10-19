package webui

import (
	"io/fs"
	"testing"
)

func TestEmbeddedIndexPresent(t *testing.T) {
	if _, err := fs.Stat(Files(), "index.html"); err != nil {
		t.Fatal(err)
	}
}
