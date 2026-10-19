package storage_test

import (
	"testing"

	"github.com/ulrichheringer/pjsuite/server/internal/storage"
)

func TestFromEnv(t *testing.T) {
	r2 := map[string]string{
		"PJSUITE_R2_ACCOUNT_ID":        "acct",
		"PJSUITE_R2_ACCESS_KEY_ID":     "id",
		"PJSUITE_R2_SECRET_ACCESS_KEY": "secret",
		"PJSUITE_R2_BUCKET":            "bucket",
	}
	without := func(key string) map[string]string {
		env := map[string]string{}
		for k, v := range r2 {
			if k != key {
				env[k] = v
			}
		}
		return env
	}
	tests := []struct {
		name    string
		env     map[string]string
		wantDir bool
		wantR2  bool
		wantErr bool
	}{
		{"none uses default dir", map[string]string{}, true, false, false},
		{"none uses PJSUITE_FILES", map[string]string{"PJSUITE_FILES": "custom"}, true, false, false},
		{"all uses R2", r2, false, true, false},
		{"missing account", without("PJSUITE_R2_ACCOUNT_ID"), false, false, true},
		{"missing key id", without("PJSUITE_R2_ACCESS_KEY_ID"), false, false, true},
		{"missing secret", without("PJSUITE_R2_SECRET_ACCESS_KEY"), false, false, true},
		{"missing bucket", without("PJSUITE_R2_BUCKET"), false, false, true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Chdir(t.TempDir())
			got, err := storage.FromEnv(func(k string) string { return tc.env[k] })
			if (err != nil) != tc.wantErr {
				t.Fatalf("err = %v, wantErr %v", err, tc.wantErr)
			}
			_, isDir := got.(*storage.Dir)
			_, isR2 := got.(*storage.R2)
			if isDir != tc.wantDir || isR2 != tc.wantR2 {
				t.Fatalf("got %T", got)
			}
		})
	}
}
