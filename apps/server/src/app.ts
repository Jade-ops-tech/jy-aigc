import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@jy-aigc/api/context";
import { appRouter } from "@jy-aigc/api/routers/index";
import { auth } from "@jy-aigc/auth";
import { env } from "@jy-aigc/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

export const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);

app.on(["POST", "GET"], "/api/auth/*", (context) =>
	auth.handler(context.req.raw)
);

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_options, context) => createContext({ context }),
	})
);

app.get("/", (context) => context.text("OK"));
