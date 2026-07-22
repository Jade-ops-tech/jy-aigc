package todo

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("todo not found")

type Todo struct {
	ID        int32  `json:"id"`
	Text      string `json:"text"`
	Completed bool   `json:"completed"`
}

type Repository interface {
	Create(context.Context, string) (Todo, error)
	Delete(context.Context, int32) error
	List(context.Context) ([]Todo, error)
	Ping(context.Context) error
	SetCompleted(context.Context, int32, bool) (Todo, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (repository *PostgresRepository) Ping(ctx context.Context) error {
	return repository.pool.Ping(ctx)
}

func (repository *PostgresRepository) List(ctx context.Context) ([]Todo, error) {
	rows, err := repository.pool.Query(ctx, `
		SELECT id, text, completed
		FROM todo
		ORDER BY id DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("list todos: %w", err)
	}
	defer rows.Close()

	todos := make([]Todo, 0)
	for rows.Next() {
		var item Todo
		if err := rows.Scan(&item.ID, &item.Text, &item.Completed); err != nil {
			return nil, fmt.Errorf("scan todo: %w", err)
		}
		todos = append(todos, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate todos: %w", err)
	}

	return todos, nil
}

func (repository *PostgresRepository) Create(ctx context.Context, text string) (Todo, error) {
	var created Todo
	err := repository.pool.QueryRow(ctx, `
		INSERT INTO todo (text)
		VALUES ($1)
		RETURNING id, text, completed
	`, text).Scan(&created.ID, &created.Text, &created.Completed)
	if err != nil {
		return Todo{}, fmt.Errorf("create todo: %w", err)
	}

	return created, nil
}

func (repository *PostgresRepository) SetCompleted(ctx context.Context, id int32, completed bool) (Todo, error) {
	var updated Todo
	err := repository.pool.QueryRow(ctx, `
		UPDATE todo
		SET completed = $2
		WHERE id = $1
		RETURNING id, text, completed
	`, id, completed).Scan(&updated.ID, &updated.Text, &updated.Completed)
	if errors.Is(err, pgx.ErrNoRows) {
		return Todo{}, ErrNotFound
	}
	if err != nil {
		return Todo{}, fmt.Errorf("update todo: %w", err)
	}

	return updated, nil
}

func (repository *PostgresRepository) Delete(ctx context.Context, id int32) error {
	result, err := repository.pool.Exec(ctx, "DELETE FROM todo WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("delete todo: %w", err)
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}
