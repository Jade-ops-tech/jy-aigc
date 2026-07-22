package main

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (function roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return function(request)
}

func TestCheckHealthAcceptsOKResponse(t *testing.T) {
	client := testHealthClient(http.StatusOK)
	if err := checkHealth(context.Background(), client, "http://go-api.test/health"); err != nil {
		t.Fatalf("checkHealth() returned an error: %v", err)
	}
}

func TestCheckHealthRejectsUnhealthyResponse(t *testing.T) {
	client := testHealthClient(http.StatusServiceUnavailable)
	if err := checkHealth(context.Background(), client, "http://go-api.test/health"); err == nil {
		t.Fatal("expected an unhealthy response to return an error")
	}
}

func testHealthClient(status int) *http.Client {
	return &http.Client{
		Timeout: time.Second,
		Transport: roundTripFunc(func(_ *http.Request) (*http.Response, error) {
			return &http.Response{
				Body:       io.NopCloser(strings.NewReader("")),
				StatusCode: status,
			}, nil
		}),
	}
}
