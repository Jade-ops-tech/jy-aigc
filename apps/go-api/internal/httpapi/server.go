package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/go-chi/chi/v5"
	"github.com/jade-ops-tech/jy-aigc/apps/go-api/internal/todo"
)

const (
	maxRequestBodyBytes = 1 << 20
	maxTodoTextLength   = 500
	maxUsernameLength   = 50
)

type Server struct {
	repository todo.Repository
	logger     *log.Logger
}

type errorResponse struct {
	Error string `json:"error"`
}

type createTodoRequest struct {
	Text string `json:"text"`
}

type updateTodoRequest struct {
	Completed *bool `json:"completed"`
}

type profileResponse struct {
	Introduction string `json:"introduction"`
	Username     string `json:"username"`
}

func NewHandler(repository todo.Repository, logger *log.Logger, corsOrigin string) http.Handler {
	server := &Server{repository: repository, logger: logger}
	router := chi.NewRouter()
	router.Use(server.recoverPanic)
	router.Use(server.requestLogger)
	router.Use(cors(corsOrigin))

	router.Get("/health", server.health)
	router.Get("/api/profile/{username}", server.profile)
	router.Route("/api/todos", func(router chi.Router) {
		router.Get("/", server.listTodos)
		router.Post("/", server.createTodo)
		router.Patch("/{id}", server.updateTodo)
		router.Delete("/{id}", server.deleteTodo)
	})

	return router
}

func (server *Server) health(writer http.ResponseWriter, request *http.Request) {
	if err := server.repository.Ping(request.Context()); err != nil {
		server.logger.Printf("database health check failed: %v", err)
		writeJSON(writer, http.StatusServiceUnavailable, errorResponse{Error: "database unavailable"})
		return
	}

	writeJSON(writer, http.StatusOK, map[string]string{"status": "ok"})
}

func (server *Server) profile(writer http.ResponseWriter, request *http.Request) {
	username := strings.TrimSpace(chi.URLParam(request, "username"))
	if username == "" || utf8.RuneCountInString(username) > maxUsernameLength {
		writeJSON(writer, http.StatusBadRequest, errorResponse{Error: "username must contain between 1 and 50 characters"})
		return
	}

	introduction := fmt.Sprintf(
		"你好，我是 %s。我正在使用 Go、React 和 AWS 构建 Daily Musings，并逐步把 Node.js 数据服务迁移到 Go。",
		username,
	)
	writeJSON(writer, http.StatusOK, profileResponse{
		Introduction: introduction,
		Username:     username,
	})
}

func (server *Server) listTodos(writer http.ResponseWriter, request *http.Request) {
	todos, err := server.repository.List(request.Context())
	if err != nil {
		server.internalError(writer, "list todos", err)
		return
	}

	writeJSON(writer, http.StatusOK, todos)
}

func (server *Server) createTodo(writer http.ResponseWriter, request *http.Request) {
	var input createTodoRequest
	if err := decodeJSON(writer, request, &input); err != nil {
		writeJSON(writer, http.StatusBadRequest, errorResponse{Error: err.Error()})
		return
	}

	text := strings.TrimSpace(input.Text)
	if text == "" || utf8.RuneCountInString(text) > maxTodoTextLength {
		writeJSON(writer, http.StatusBadRequest, errorResponse{Error: "text must contain between 1 and 500 characters"})
		return
	}

	created, err := server.repository.Create(request.Context(), text)
	if err != nil {
		server.internalError(writer, "create todo", err)
		return
	}

	writeJSON(writer, http.StatusCreated, created)
}

func (server *Server) updateTodo(writer http.ResponseWriter, request *http.Request) {
	id, ok := parseID(writer, request)
	if !ok {
		return
	}

	var input updateTodoRequest
	if err := decodeJSON(writer, request, &input); err != nil {
		writeJSON(writer, http.StatusBadRequest, errorResponse{Error: err.Error()})
		return
	}
	if input.Completed == nil {
		writeJSON(writer, http.StatusBadRequest, errorResponse{Error: "completed is required"})
		return
	}

	updated, err := server.repository.SetCompleted(request.Context(), id, *input.Completed)
	if errors.Is(err, todo.ErrNotFound) {
		writeJSON(writer, http.StatusNotFound, errorResponse{Error: "todo not found"})
		return
	}
	if err != nil {
		server.internalError(writer, "update todo", err)
		return
	}

	writeJSON(writer, http.StatusOK, updated)
}

func (server *Server) deleteTodo(writer http.ResponseWriter, request *http.Request) {
	id, ok := parseID(writer, request)
	if !ok {
		return
	}

	err := server.repository.Delete(request.Context(), id)
	if errors.Is(err, todo.ErrNotFound) {
		writeJSON(writer, http.StatusNotFound, errorResponse{Error: "todo not found"})
		return
	}
	if err != nil {
		server.internalError(writer, "delete todo", err)
		return
	}

	writer.WriteHeader(http.StatusNoContent)
}

func (server *Server) internalError(writer http.ResponseWriter, operation string, err error) {
	server.logger.Printf("%s: %v", operation, err)
	writeJSON(writer, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
}

func (server *Server) requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		startedAt := time.Now()
		next.ServeHTTP(writer, request)
		server.logger.Printf(
			"request completed method=%s path=%s duration=%s",
			request.Method,
			request.URL.Path,
			time.Since(startedAt),
		)
	})
}

func (server *Server) recoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				server.logger.Printf("request panic: %v", recovered)
				writeJSON(writer, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
			}
		}()
		next.ServeHTTP(writer, request)
	})
}

func cors(allowedOrigin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
			if request.Header.Get("Origin") == allowedOrigin {
				writer.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
				writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
				writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
				writer.Header().Set("Vary", "Origin")
			}

			if request.Method == http.MethodOptions {
				writer.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(writer, request)
		})
	}
}

func decodeJSON(writer http.ResponseWriter, request *http.Request, destination interface{}) error {
	request.Body = http.MaxBytesReader(writer, request.Body, maxRequestBodyBytes)
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		return errors.New("request body must be valid JSON")
	}
	if decoder.Decode(&struct{}{}) == nil {
		return errors.New("request body must contain one JSON object")
	}
	return nil
}

func parseID(writer http.ResponseWriter, request *http.Request) (int32, bool) {
	parsed, err := strconv.ParseInt(chi.URLParam(request, "id"), 10, 32)
	if err != nil || parsed <= 0 {
		writeJSON(writer, http.StatusBadRequest, errorResponse{Error: "id must be a positive integer"})
		return 0, false
	}
	return int32(parsed), true
}

func writeJSON(writer http.ResponseWriter, status int, value interface{}) {
	writer.Header().Set("Content-Type", "application/json; charset=utf-8")
	writer.WriteHeader(status)
	if err := json.NewEncoder(writer).Encode(value); err != nil {
		log.Printf("encode response: %v", err)
	}
}
