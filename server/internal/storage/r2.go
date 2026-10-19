package storage

import (
	"context"
	"errors"
	"io"
	"io/fs"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type R2 struct {
	client *s3.Client
	bucket string
}

var (
	_ Store = (*R2)(nil)
	_ Store = (*Dir)(nil)
	_ Store = (*Memory)(nil)
)

func NewR2(accountID, accessKeyID, secretAccessKey, bucket string) *R2 {
	client := s3.New(s3.Options{
		Region:       "auto",
		BaseEndpoint: aws.String("https://" + accountID + ".r2.cloudflarestorage.com"),
		Credentials:  credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, ""),
	})
	return &R2{client: client, bucket: bucket}
}

func (r *R2) Put(ctx context.Context, key string, body io.Reader, size int64, contentType string) error {
	_, err := r.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        &r.bucket,
		Key:           &key,
		Body:          body,
		ContentLength: &size,
		ContentType:   &contentType,
	})
	return err
}

func (r *R2) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	out, err := r.client.GetObject(ctx, &s3.GetObjectInput{Bucket: &r.bucket, Key: &key})
	var missing *types.NoSuchKey
	if errors.As(err, &missing) {
		return nil, fs.ErrNotExist
	}
	if err != nil {
		return nil, err
	}
	return out.Body, nil
}

func (r *R2) Delete(ctx context.Context, key string) error {
	_, err := r.client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: &r.bucket, Key: &key})
	return err
}
