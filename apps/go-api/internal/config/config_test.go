package config

import "testing"

func TestLoadUsesDatabaseURL(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("PORT", "3100")
	t.Setenv("DATABASE_POOL_MAX", "8")

	loaded, err := Load()
	if err != nil {
		t.Fatalf("Load() returned an error: %v", err)
	}

	if loaded.Address != ":3100" {
		t.Fatalf("expected address :3100, got %q", loaded.Address)
	}
	if loaded.DatabasePool != 8 {
		t.Fatalf("expected pool size 8, got %d", loaded.DatabasePool)
	}
}

func TestLoadRejectsInvalidPort(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("PORT", "invalid")

	if _, err := Load(); err == nil {
		t.Fatal("expected invalid PORT to return an error")
	}
}
