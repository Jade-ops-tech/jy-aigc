import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		rolldownOptions: {
			output: {
				codeSplitting: {
					groups: [
						{
							name: "react",
							priority: 4,
							test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
						},
						{
							name: "tanstack",
							priority: 3,
							test: /node_modules[\\/]@tanstack[\\/]/,
						},
						{
							name: "ui",
							priority: 2,
							test: /node_modules[\\/](@base-ui|@shadcn|lucide-react|sonner|next-themes)[\\/]/,
						},
						{
							name: "vendor",
							priority: 1,
							test: /node_modules[\\/]/,
						},
					],
				},
			},
		},
	},
	server: {
		port: 3001,
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		tailwindcss(),
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		react(),
	],
});
