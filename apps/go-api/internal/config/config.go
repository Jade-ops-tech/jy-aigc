package config

import (
	"errors"
	"fmt"
	"net"
	"net/url"
	"os"
	"strconv"
)

const (
	defaultCORSOrigin   = "http://localhost:3001"
	defaultDatabasePort = 5432
	defaultPoolMax      = 4
	defaultPort         = 3002
)

type Config struct {
	Address      string
	CORSOrigin   string
	DatabaseURL  string
	DatabasePool int32
}

func Load() (Config, error) {
	port, err := positiveIntFromEnv("PORT", defaultPort)
	if err != nil {
		return Config{}, err
	}

	poolMax, err := positiveIntFromEnv("DATABASE_POOL_MAX", defaultPoolMax)
	if err != nil {
		return Config{}, err
	}

	databaseURL, err := resolveDatabaseURL()
	if err != nil {
		return Config{}, err
	}

	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = defaultCORSOrigin
	}

	return Config{
		Address:      fmt.Sprintf(":%d", port),
		CORSOrigin:   corsOrigin,
		DatabaseURL:  databaseURL,
		DatabasePool: int32(poolMax),
	}, nil
}

func resolveDatabaseURL() (string, error) {
	if databaseURL := os.Getenv("DATABASE_URL"); databaseURL != "" {
		return databaseURL, nil
	}

	host := os.Getenv("DATABASE_HOST")
	databaseName := os.Getenv("DATABASE_NAME")
	user := os.Getenv("DATABASE_USER")
	password := os.Getenv("DATABASE_PASSWORD")
	if host == "" || databaseName == "" || user == "" || password == "" {
		return "", errors.New("DATABASE_URL or all DATABASE_HOST, DATABASE_NAME, DATABASE_USER and DATABASE_PASSWORD values are required")
	}

	port, err := positiveIntFromEnv("DATABASE_PORT", defaultDatabasePort)
	if err != nil {
		return "", err
	}

	databaseURL := url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(user, password),
		Host:     net.JoinHostPort(host, strconv.Itoa(port)),
		Path:     databaseName,
		RawQuery: "sslmode=require",
	}
	return databaseURL.String(), nil
}

func positiveIntFromEnv(name string, fallback int) (int, error) {
	value := os.Getenv(name)
	if value == "" {
		return fallback, nil
	}

	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return 0, fmt.Errorf("%s must be a positive integer", name)
	}

	return parsed, nil
}
