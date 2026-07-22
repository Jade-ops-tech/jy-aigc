import { Button } from "@jy-aigc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@jy-aigc/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	BookOpenText,
	Cloud,
	Feather,
	Quote,
	ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

const FEATURES = [
	{
		description: "把每天细小却重要的想法，安静地留在只属于你的空间里。",
		icon: Feather,
		title: "轻盈记录",
	},
	{
		description: "账号与日记内容分开守护，登录后才能进入你的个人记录。",
		icon: ShieldCheck,
		title: "私密安心",
	},
	{
		description: "由 Go API 与云端服务支撑，让每一次书写都稳定、顺畅。",
		icon: Cloud,
		title: "云端同步",
	},
] as const;

function LandingPage() {
	return (
		<div className="h-max min-h-svh overflow-x-clip bg-canvas font-ui text-ink">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--color-brand-container)_32%,transparent),transparent_58%)]"
			/>

			<header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
				<Link className="flex items-center gap-3" to="/">
					<span className="grid size-9 place-items-center rounded-full bg-brand text-canvas">
						<BookOpenText aria-hidden="true" className="size-4" />
					</span>
					<span className="font-serif text-lg">Daily Musings</span>
				</Link>

				<nav aria-label="账户导航" className="flex items-center gap-2">
					<Button
						className="rounded-full px-4 text-ink-muted hover:text-ink"
						nativeButton={false}
						render={<Link search={{ mode: "sign-in" }} to="/login" />}
						variant="ghost"
					>
						登录
					</Button>
					<Button
						className="rounded-full bg-brand px-5 text-canvas hover:bg-brand/90"
						nativeButton={false}
						render={<Link search={{ mode: "sign-up" }} to="/login" />}
					>
						注册
					</Button>
				</nav>
			</header>

			<main className="relative">
				<section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pt-14 pb-24 sm:px-8 sm:pt-20 lg:grid-cols-[1.08fr_0.92fr] lg:px-10 lg:pt-24 lg:pb-32">
					<div className="flex flex-col items-start gap-8">
						<div className="flex flex-col gap-5">
							<p className="font-medium text-brand text-xs uppercase tracking-[0.22em]">
								A quiet place for your thoughts
							</p>
							<h1 className="max-w-3xl font-serif text-5xl leading-[1.12] tracking-[-0.035em] sm:text-[52px]">
								让每一天的想法，
								<br />
								都有一处温柔归宿。
							</h1>
							<p className="max-w-xl text-base text-ink-muted leading-8 sm:text-lg">
								Daily Musings
								是一间安静的数字日记。写下片刻心情、生活片段与成长轨迹，在日复一日里重新看见自己。
							</p>
						</div>

						<div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
							<Button
								className="h-12 rounded-full bg-brand px-7 text-canvas text-sm shadow-brand/15 shadow-lg hover:bg-brand/90"
								nativeButton={false}
								render={<Link search={{ mode: "sign-up" }} to="/login" />}
								size="lg"
							>
								开始记录
								<ArrowRight aria-hidden="true" data-icon="inline-end" />
							</Button>
							<Button
								className="h-12 rounded-full border-outline bg-surface/70 px-7 text-ink text-sm hover:bg-surface-low"
								nativeButton={false}
								render={<Link search={{ mode: "sign-in" }} to="/login" />}
								size="lg"
								variant="outline"
							>
								已有账号，去登录
							</Button>
						</div>
					</div>

					<div className="relative mx-auto w-full max-w-lg lg:ml-auto">
						<div
							aria-hidden="true"
							className="absolute -inset-5 -rotate-2 rounded-3xl border border-brand/10 bg-brand-container/20"
						/>
						<Card className="relative gap-0 rounded-3xl border border-outline/70 bg-surface/95 py-0 shadow-2xl shadow-brand/10 ring-0 backdrop-blur">
							<CardHeader className="flex-row items-center justify-between border-outline/60 border-b px-7 py-6">
								<div className="flex flex-col gap-1">
									<CardTitle className="font-serif text-ink text-xl">
										今天的片刻
									</CardTitle>
									<CardDescription className="text-ink-muted">
										Wednesday · 22 July
									</CardDescription>
								</div>
								<span className="size-2 rounded-full bg-brand-container" />
							</CardHeader>
							<CardContent className="flex flex-col gap-8 px-7 py-8 sm:px-9 sm:py-10">
								<Quote aria-hidden="true" className="size-7 text-brand/45" />
								<p className="font-serif text-2xl text-ink leading-10 sm:text-[28px]">
									今天不必急着抵达。把脚步放慢一点，也许会听见生活正轻轻回答。
								</p>
								<div className="flex items-center justify-between border-outline/60 border-t pt-6 text-ink-muted text-xs">
									<span>心情 · 平静</span>
									<span>2 min read</span>
								</div>
							</CardContent>
						</Card>
					</div>
				</section>

				<section
					aria-labelledby="features-title"
					className="border-outline/60 border-y bg-surface-low/55"
				>
					<div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:px-10">
						<div className="mb-12 flex max-w-2xl flex-col gap-3">
							<p className="font-medium text-brand text-xs uppercase tracking-[0.2em]">
								Made for reflection
							</p>
							<h2
								className="font-serif text-3xl sm:text-4xl"
								id="features-title"
							>
								简单书写，认真收藏
							</h2>
						</div>

						<div className="grid gap-5 md:grid-cols-3">
							{FEATURES.map(({ description, icon: Icon, title }) => (
								<Card
									className="rounded-2xl border border-outline/60 bg-surface py-0 ring-0"
									key={title}
								>
									<CardHeader className="gap-5 px-6 py-7">
										<span className="grid size-10 place-items-center rounded-full bg-surface-low text-brand">
											<Icon aria-hidden="true" className="size-5" />
										</span>
										<div className="flex flex-col gap-2">
											<CardTitle className="font-serif text-ink text-xl">
												{title}
											</CardTitle>
											<CardDescription className="text-ink-muted text-sm leading-7">
												{description}
											</CardDescription>
										</div>
									</CardHeader>
								</Card>
							))}
						</div>
					</div>
				</section>
			</main>

			<footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-8 text-ink-muted text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
				<p>Daily Musings · 为日常留下一点空白</p>
				<p>React · Go · AWS</p>
			</footer>
		</div>
	);
}
