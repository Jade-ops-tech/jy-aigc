package database

import (
	"context"
	"strings"
	"testing"
)

func TestOpenDoesNotExposeInvalidDatabaseURL(t *testing.T) {
	const secretPassword = "super-secret-password"
	_, err := Open(
		context.Background(),
		"postgres://user:"+secretPassword+"@database.example/test\n",
		1,
	)
	if err == nil {
		t.Fatal("expected an invalid database URL to return an error")
	}
	if strings.Contains(err.Error(), secretPassword) {
		t.Fatal("database configuration error exposed the password")
	}
}
