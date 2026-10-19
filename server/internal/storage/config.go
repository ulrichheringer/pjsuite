package storage

import (
	"errors"
	"fmt"
)

const defaultDir = "files"

func FromEnv(getenv func(string) string) (Store, error) {
	account := getenv("PJSUITE_R2_ACCOUNT_ID")
	keyID := getenv("PJSUITE_R2_ACCESS_KEY_ID")
	secret := getenv("PJSUITE_R2_SECRET_ACCESS_KEY")
	bucket := getenv("PJSUITE_R2_BUCKET")
	switch {
	case account != "" && keyID != "" && secret != "" && bucket != "":
		return NewR2(account, keyID, secret, bucket), nil
	case account != "" || keyID != "" || secret != "" || bucket != "":
		return nil, errors.New("incomplete R2 config: set all of PJSUITE_R2_ACCOUNT_ID, PJSUITE_R2_ACCESS_KEY_ID, PJSUITE_R2_SECRET_ACCESS_KEY, PJSUITE_R2_BUCKET or none")
	}
	dir := getenv("PJSUITE_FILES")
	if dir == "" {
		dir = defaultDir
	}
	d, err := NewDir(dir)
	if err != nil {
		return nil, fmt.Errorf("local files store: %w", err)
	}
	return d, nil
}
