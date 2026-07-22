package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jade-ops-tech/jy-aigc/apps/go-api/internal/config"
	"github.com/jade-ops-tech/jy-aigc/apps/go-api/internal/database"
	"github.com/jade-ops-tech/jy-aigc/apps/go-api/internal/httpapi"
	"github.com/jade-ops-tech/jy-aigc/apps/go-api/internal/todo"
	"github.com/joho/godotenv"
)

const (
	defaultPort        = "3002"
	healthcheckTimeout = 3 * time.Second
	shutdownTimeout    = 10 * time.Second
)

func main() {
	logger := log.New(os.Stdout, "go-api ", log.LstdFlags|log.LUTC)
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		if err := runHealthcheck(); err != nil {
			logger.Printf("healthcheck failed: %v", err)
			os.Exit(1)
		}
		return
	}

	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		logger.Printf("load .env: %v", err)
		os.Exit(1)
	}

	applicationConfig, err := config.Load()
	if err != nil {
		logger.Printf("load configuration: %v", err)
		os.Exit(1)
	}

	rootContext, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := database.Open(rootContext, applicationConfig.DatabaseURL, applicationConfig.DatabasePool)
	if err != nil {
		logger.Printf("open database: %v", err)
		os.Exit(1)
	}
	defer pool.Close()

	repository := todo.NewPostgresRepository(pool)
	server := &http.Server{
		Addr:              applicationConfig.Address,
		Handler:           httpapi.NewHandler(repository, logger, applicationConfig.CORSOrigin),
		ReadHeaderTimeout: 5 * time.Second,
	}

	serverErrors := make(chan error, 1)
	go func() {
		logger.Printf("listening on %s", applicationConfig.Address)
		serverErrors <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErrors:
		if !errors.Is(err, http.ErrServerClosed) {
			logger.Printf("serve HTTP: %v", err)
			os.Exit(1)
		}
	case <-rootContext.Done():
		shutdownContext, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancel()
		if err := server.Shutdown(shutdownContext); err != nil {
			logger.Printf("shutdown server: %v", err)
			os.Exit(1)
		}
	}
}

func runHealthcheck() error {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	endpoint := url.URL{
		Scheme: "http",
		Host:   net.JoinHostPort("127.0.0.1", port),
		Path:   "/health",
	}
	client := &http.Client{Timeout: healthcheckTimeout}
	return checkHealth(context.Background(), client, endpoint.String())
}

func checkHealth(ctx context.Context, client *http.Client, endpoint string) error {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return fmt.Errorf("create healthcheck request: %w", err)
	}

	response, err := client.Do(request)
	if err != nil {
		return fmt.Errorf("request health endpoint: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("health endpoint returned status %d", response.StatusCode)
	}

	return nil
}
