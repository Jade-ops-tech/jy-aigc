import { TRPCError } from "@trpc/server";
import { z } from "zod";

const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_API_VERSION = "2022-11-28";
const GITHUB_TIMEOUT_MS = 8000;

const githubUserSchema = z.object({
	id: z.number(),
	login: z.string(),
	name: z.string().nullable(),
	avatar_url: z.string().nullable(),
	html_url: z.string().nullable(),
});

export interface GithubUserProfile {
	avatarUrl: string | null;
	githubUserId: string;
	login: string;
	name: string | null;
	profileUrl: string | null;
}

export async function fetchGithubUser(
	token: string
): Promise<GithubUserProfile> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), GITHUB_TIMEOUT_MS);

	try {
		const response = await fetch(GITHUB_USER_URL, {
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${token}`,
				"User-Agent": "jy-aigc",
				"X-GitHub-Api-Version": GITHUB_API_VERSION,
			},
			signal: controller.signal,
		});

		if (response.status === 401) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "GitHub token 无效，请检查后再试。",
			});
		}

		if (response.status === 403) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "GitHub 拒绝了这次请求，请确认 token 权限或稍后再试。",
			});
		}

		if (!response.ok) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "暂时无法验证这个 GitHub token。",
			});
		}

		const parsed = githubUserSchema.parse(await response.json());
		return {
			avatarUrl: parsed.avatar_url,
			githubUserId: `${parsed.id}`,
			login: parsed.login,
			name: parsed.name,
			profileUrl: parsed.html_url,
		};
	} catch (error) {
		if (error instanceof TRPCError) {
			throw error;
		}
		if (error instanceof Error && error.name === "AbortError") {
			throw new TRPCError({
				code: "TIMEOUT",
				message: "连接 GitHub 超时，请稍后再试。",
			});
		}
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "连接 GitHub 时出现网络异常。",
		});
	} finally {
		clearTimeout(timeoutId);
	}
}
