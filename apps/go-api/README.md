# Go API

This service is the first incremental migration from the Node.js API. It owns
the REST endpoints for todos and the username-based profile introduction while
sharing the existing PostgreSQL schema.

## Local setup

Go 1.20 or newer is required. Copy `.env.example` to `.env` and point
`DATABASE_URL` at the same database used by `apps/server`.

```bash
cp apps/go-api/.env.example apps/go-api/.env
pnpm --filter go-api dev
```

The service listens on `http://localhost:3002` by default.

## Endpoints

- `GET /health`
- `GET /api/profile/{username}`
- `GET /api/todos`
- `POST /api/todos`
- `PATCH /api/todos/{id}`
- `DELETE /api/todos/{id}`

Run checks from the repository root:

```bash
pnpm --filter go-api test
pnpm --filter go-api check-types
pnpm --filter go-api build
```

## Container

Build the production-compatible ARM64 image locally:

```bash
docker buildx build --platform linux/arm64 --load -t jy-aigc-go-api:local apps/go-api
docker run --rm --name jy-aigc-go-api --env-file apps/go-api/.env -p 3002:3002 jy-aigc-go-api:local
```

In a second terminal, run the same command ECS uses inside the running container:

```bash
docker exec jy-aigc-go-api /go-api healthcheck
```

Deployment instructions are in `docs/go-ecs-deployment.md`.
