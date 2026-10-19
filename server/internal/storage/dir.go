package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
)

type Dir struct{ root *os.Root }

func NewDir(path string) (*Dir, error) {
	if err := os.MkdirAll(path, 0o750); err != nil {
		return nil, fmt.Errorf("create files dir: %w", err)
	}
	root, err := os.OpenRoot(path)
	if err != nil {
		return nil, fmt.Errorf("open files dir: %w", err)
	}
	return &Dir{root: root}, nil
}

func (d *Dir) Put(_ context.Context, key string, r io.Reader, _ int64, _ string) (err error) {
	f, err := d.root.OpenFile(key, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o640)
	if err != nil {
		return err
	}
	defer func() { err = errors.Join(err, f.Close()) }()
	_, err = io.Copy(f, r)
	return err
}

func (d *Dir) Get(_ context.Context, key string) (io.ReadCloser, error) {
	return d.root.Open(key)
}

func (d *Dir) Delete(_ context.Context, key string) error {
	err := d.root.Remove(key)
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	return err
}
