import starlight from "@astrojs/starlight";
// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	site: process.env.SITE_URL ?? "http://localhost:4321",
	integrations: [
		starlight({
			title: "Daily Musings",
			sidebar: [
				{
					label: "使用指南",
					items: [{ label: "本地开发", slug: "guides/example" }],
				},
				{
					label: "工程参考",
					items: [{ label: "架构与安全", slug: "reference/example" }],
				},
			],
		}),
	],
});
