import { Button } from "@jy-aigc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@jy-aigc/ui/components/card";
import { Input } from "@jy-aigc/ui/components/input";
import { Label } from "@jy-aigc/ui/components/label";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { type FormEvent, useState } from "react";

import { getProfileIntroduction } from "@/lib/go-api";

export const Route = createFileRoute("/about")({
	component: AboutRoute,
});

function AboutRoute() {
	const [username, setUsername] = useState("jiaoyang");
	const profile = useMutation({ mutationFn: getProfileIntroduction });

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const normalizedUsername = username.trim();
		if (normalizedUsername) {
			profile.mutate(normalizedUsername);
		}
	};

	return (
		<main className="min-h-full bg-canvas font-ui text-ink">
			<div className="reading-column flex flex-col gap-10 py-10">
				<header className="flex items-center justify-between gap-4">
					<Link
						className="inline-flex items-center gap-2 text-[13px] text-ink-muted transition-colors hover:text-ink"
						to="/"
					>
						<ArrowLeft aria-hidden="true" className="size-4" />
						Daily Musings
					</Link>
					<span className="rounded-full border border-ink/10 px-3 py-1 text-[12px] text-ink-muted">
						Go API · Stage A
					</span>
				</header>

				<section className="flex flex-col gap-3">
					<p className="font-medium text-[12px] text-brand uppercase tracking-[0.18em]">
						Personal introduction
					</p>
					<h1 className="max-w-2xl font-serif text-[36px] leading-[44px]">
						用你的用户名，认识正在迁移到 Go 的我。
					</h1>
					<p className="max-w-xl text-[15px] text-ink-muted leading-7">
						这个页面通过 Lambda 和 Cloud Map 调用 Go 服务，展示阶段 A、B
						的前后端连接结果。
					</p>
				</section>

				<Card className="max-w-2xl">
					<CardHeader>
						<CardTitle>生成个人介绍</CardTitle>
						<CardDescription>
							输入用户名，Go API 会返回对应的介绍文本。
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-6">
						<form
							className="flex flex-col gap-3 sm:flex-row sm:items-end"
							onSubmit={handleSubmit}
						>
							<div className="flex flex-1 flex-col gap-2">
								<Label htmlFor="profile-username">用户名</Label>
								<Input
									id="profile-username"
									maxLength={50}
									onChange={(event) => setUsername(event.target.value)}
									placeholder="例如 jiaoyang"
									value={username}
								/>
							</div>
							<Button
								disabled={profile.isPending || !username.trim()}
								type="submit"
							>
								{profile.isPending ? (
									<Loader2 aria-hidden="true" className="size-4 animate-spin" />
								) : (
									<Sparkles aria-hidden="true" className="size-4" />
								)}
								生成介绍
							</Button>
						</form>

						{profile.isError ? (
							<p className="text-destructive text-sm" role="alert">
								{profile.error.message}
							</p>
						) : null}

						{profile.data ? (
							<article className="border-ink/10 border-t pt-6">
								<p className="mb-2 text-[12px] text-ink-muted uppercase tracking-[0.14em]">
									@{profile.data.username}
								</p>
								<p className="font-serif text-[22px] leading-9">
									{profile.data.introduction}
								</p>
							</article>
						) : null}
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
