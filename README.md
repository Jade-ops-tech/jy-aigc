# jy-aigc

AWS 部署说明：

- Node Lambda：[docs/aws-sam-deployment.md](docs/aws-sam-deployment.md)
- Go ECS/Fargate：[docs/go-ecs-deployment.md](docs/go-ecs-deployment.md)
- Go PR 独立环境：[docs/go-pr-preview.md](docs/go-pr-preview.md)

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Router, Hono, TRPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Hono** - Lightweight, performant server framework
- **tRPC** - End-to-end type-safe APIs
- **Node.js** - Runtime environment
- **Go API** - Incrementally migrated REST endpoints backed by PostgreSQL
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system
- **Biome** - Linting and formatting
- **Starlight** - Documentation site with Astro
- **Private journal** - Create, browse, edit, and soft-delete personal entries
- **Draft recovery** - Throttled local draft persistence for new entries
- **GitHub integration** - Encrypted multi-token storage and GitHub profile validation

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply migrations to a new database:

```bash
pnpm run db:migrate
```

> The first migration is a full baseline. If the database was previously created
> with `db:push`, inspect `drizzle.__drizzle_migrations` before migrating so the
> baseline is not applied twice.

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).
The Go API runs at [http://localhost:3002](http://localhost:3002) after copying
`apps/go-api/.env.example` to `apps/go-api/.env` and setting the same database
connection used by the Node server.

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@jy-aigc/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Git Hooks and Formatting

- Run checks: `pnpm run check`

## Project Structure

```
jy-aigc/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   ├── docs/        # Documentation site (Astro Starlight)
│   ├── go-api/      # Go REST API for migrated endpoints
│   └── server/      # Backend API (Hono, TRPC)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run dev:server`: Start only the server
- `pnpm run dev:go`: Start only the Go API
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run db:push`: Push schema changes to database
- `pnpm run db:generate`: Generate database client/types
- `pnpm run db:migrate`: Run database migrations
- `pnpm run db:studio`: Open database studio UI
- `pnpm run check`: Run Biome formatting and linting
- `cd apps/docs && pnpm run dev`: Start documentation site
- `cd apps/docs && pnpm run build`: Build documentation site

The docs site uses `SITE_URL` as its public canonical URL and falls back to
`http://localhost:4321` for local builds.
