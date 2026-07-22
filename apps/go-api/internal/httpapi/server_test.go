package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/jade-ops-tech/jy-aigc/apps/go-api/internal/todo"
)

type memoryRepository struct {
	nextID int32
	todos  []todo.Todo
}

func (repository *memoryRepository) Ping(context.Context) error {
	return nil
}

func (repository *memoryRepository) List(context.Context) ([]todo.Todo, error) {
	return repository.todos, nil
}

func (repository *memoryRepository) Create(_ context.Context, text string) (todo.Todo, error) {
	repository.nextID++
	created := todo.Todo{ID: repository.nextID, Text: text, Completed: false}
	repository.todos = append([]todo.Todo{created}, repository.todos...)
	return created, nil
}

func (repository *memoryRepository) SetCompleted(_ context.Context, id int32, completed bool) (todo.Todo, error) {
	for index := range repository.todos {
		if repository.todos[index].ID == id {
			repository.todos[index].Completed = completed
			return repository.todos[index], nil
		}
	}
	return todo.Todo{}, todo.ErrNotFound
}

func (repository *memoryRepository) Delete(_ context.Context, id int32) error {
	for index, item := range repository.todos {
		if item.ID == id {
			repository.todos = append(repository.todos[:index], repository.todos[index+1:]...)
			return nil
		}
	}
	return todo.ErrNotFound
}

func newTestHandler(repository todo.Repository) http.Handler {
	logger := log.New(io.Discard, "", 0)
	return NewHandler(repository, logger, "http://localhost:3001")
}

func TestProfileIntroduction(t *testing.T) {
	handler := newTestHandler(&memoryRepository{})
	request := httptest.NewRequest(http.MethodGet, "/api/profile/jiaoyang", nil)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.Code)
	}
	var body profileResponse
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Username != "jiaoyang" {
		t.Fatalf("expected username jiaoyang, got %q", body.Username)
	}
}

func TestTodoLifecycle(t *testing.T) {
	handler := newTestHandler(&memoryRepository{})

	created := performRequest(t, handler, http.MethodPost, "/api/todos", `{"text":"Learn Go"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("expected create status 201, got %d", created.Code)
	}

	updated := performRequest(t, handler, http.MethodPatch, "/api/todos/1", `{"completed":true}`)
	if updated.Code != http.StatusOK {
		t.Fatalf("expected update status 200, got %d", updated.Code)
	}

	listed := performRequest(t, handler, http.MethodGet, "/api/todos", "")
	if listed.Code != http.StatusOK {
		t.Fatalf("expected list status 200, got %d", listed.Code)
	}
	var todos []todo.Todo
	if err := json.NewDecoder(listed.Body).Decode(&todos); err != nil {
		t.Fatalf("decode todos: %v", err)
	}
	if len(todos) != 1 || !todos[0].Completed {
		t.Fatalf("expected one completed todo, got %#v", todos)
	}

	deleted := performRequest(t, handler, http.MethodDelete, "/api/todos/1", "")
	if deleted.Code != http.StatusNoContent {
		t.Fatalf("expected delete status 204, got %d", deleted.Code)
	}
}

func TestCreateRejectsEmptyText(t *testing.T) {
	handler := newTestHandler(&memoryRepository{})
	response := performRequest(t, handler, http.MethodPost, "/api/todos", `{"text":"   "}`)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", response.Code)
	}
}

func performRequest(t *testing.T, handler http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}
