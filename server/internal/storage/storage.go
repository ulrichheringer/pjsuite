package storage

import (
	"context"
	"io"
	"time"
)

type Store interface {
	Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) error
	Get(ctx context.Context, key string) (io.ReadCloser, error)
	Delete(ctx context.Context, key string) error
}

type Signer interface {
	SignedURL(ctx context.Context, key, name, contentType string, ttl time.Duration) (string, error)
}
