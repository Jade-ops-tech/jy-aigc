import { Toaster } from "@jy-aigc/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import type { trpc } from "@/utils/trpc";

import "../index.css";

const DevelopmentTools = import.meta.env.DEV
	? lazy(() => import("@/components/development-tools"))
	: null;

export interface RouterAppContext {
	queryClient: QueryClient;
	trpc: typeof trpc;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{
				title: "Daily Musings",
			},
			{
				name: "description",
				content: "A private, quiet place for short reflections.",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.ico",
			},
		],
	}),
});

function RootComponent() {
	return (
		<>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<div className="grid h-svh grid-rows-[1fr]">
					<Outlet />
				</div>
				<Toaster richColors />
			</ThemeProvider>
			{DevelopmentTools ? (
				<Suspense fallback={null}>
					<DevelopmentTools />
				</Suspense>
			) : null}
		</>
	);
}
