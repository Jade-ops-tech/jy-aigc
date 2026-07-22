import type { AppRouter } from "@jy-aigc/api/routers/index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";

import Loader from "@/components/loader";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/github")({
	component: GithubRoute,
});

type RouterOutputs = inferRouterOutputs<AppRouter>;
type GithubIntegrationView = RouterOutputs["github"]["list"][number];

function GithubRoute() {
	const queryClient = useQueryClient();
	const integrations = useQuery(trpc.github.list.queryOptions());
	const [label, setLabel] = useState("");
	const [token, setToken] = useState("");

	const invalidateGithub = async () => {
		await queryClient.invalidateQueries({
			queryKey: trpc.github.list.queryKey(),
		});
	};

	const createMutation = useMutation(
		trpc.github.create.mutationOptions({
			onSuccess: async () => {
				setLabel("");
				setToken("");
				await invalidateGithub();
			},
		})
	);

	const updateMutation = useMutation(
		trpc.github.update.mutationOptions({
			onSuccess: invalidateGithub,
		})
	);

	const deleteMutation = useMutation(
		trpc.github.delete.mutationOptions({
			onSuccess: invalidateGithub,
		})
	);

	const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmedToken = token.trim();
		if (!trimmedToken || createMutation.isPending) {
			return;
		}

		createMutation.mutate({
			label: label.trim() || null,
			token: trimmedToken,
		});
	};

	return (
		<main className="min-h-full bg-canvas font-ui text-ink">
			<div className="reading-column flex flex-col gap-8 py-10">
				<header className="flex flex-wrap items-center justify-between gap-4">
					<div className="flex flex-col gap-1">
						<Link
							className="font-ui text-[13px] text-ink-muted transition-colors hover:text-ink"
							to="/journal"
						>
							返回记录
						</Link>
						<h1 className="font-serif text-[24px] text-ink leading-[36px]">
							GitHub Token
						</h1>
					</div>
				</header>

				<section className="rounded-[20px] bg-surface p-6 shadow-[0_2px_16px_rgba(125,86,45,0.08)] ring-1 ring-outline/40">
					<form className="flex flex-col gap-5" onSubmit={handleCreate}>
						<div className="flex flex-col gap-2">
							<label
								className="font-ui text-[13px] text-ink-muted"
								htmlFor="github-label"
							>
								名称
							</label>
							<input
								className="rounded-xl border border-outline bg-surface-high px-4 py-3 font-ui text-[15px] outline-none transition-colors focus:border-brand"
								id="github-label"
								onChange={(event) => setLabel(event.target.value)}
								placeholder="Personal, Work..."
								value={label}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<label
								className="font-ui text-[13px] text-ink-muted"
								htmlFor="github-token"
							>
								Token
							</label>
							<input
								autoComplete="off"
								className="rounded-xl border border-outline bg-surface-high px-4 py-3 font-ui text-[15px] outline-none transition-colors focus:border-brand"
								id="github-token"
								onChange={(event) => setToken(event.target.value)}
								placeholder="ghp_..."
								type="password"
								value={token}
							/>
							<p className="font-ui text-[12px] text-ink-muted leading-[18px]">
								只读取 GitHub 账户基础信息。保存后不会再显示明文 token。
							</p>
						</div>

						<div className="flex flex-wrap items-center gap-3">
							<button
								className="rounded-full bg-brand px-6 py-2.5 font-ui text-[14px] text-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
								disabled={!token.trim() || createMutation.isPending}
								type="submit"
							>
								{createMutation.isPending ? "保存中..." : "保存"}
							</button>
							{createMutation.error ? (
								<p className="font-ui text-[#c25b4e] text-[13px]">
									{createMutation.error.message}
								</p>
							) : null}
						</div>
					</form>
				</section>

				<GithubList
					deleteError={deleteMutation.error?.message}
					deletingId={deleteMutation.variables?.id}
					integrations={integrations.data ?? []}
					isDeleting={deleteMutation.isPending}
					isError={integrations.isError}
					isLoading={integrations.isLoading}
					isUpdating={updateMutation.isPending}
					onDelete={(id) => deleteMutation.mutate({ id })}
					onUpdate={(input) => updateMutation.mutate(input)}
					updateError={updateMutation.error?.message}
					updatingId={updateMutation.variables?.id}
				/>
			</div>
		</main>
	);
}

interface GithubListProps {
	deleteError?: string;
	deletingId?: string;
	integrations: GithubIntegrationView[];
	isDeleting: boolean;
	isError: boolean;
	isLoading: boolean;
	isUpdating: boolean;
	onDelete: (id: string) => void;
	onUpdate: (input: {
		id: string;
		label?: string | null;
		token?: string;
	}) => void;
	updateError?: string;
	updatingId?: string;
}

function GithubList({
	integrations,
	isLoading,
	isError,
	isUpdating,
	isDeleting,
	updatingId,
	deletingId,
	updateError,
	deleteError,
	onUpdate,
	onDelete,
}: GithubListProps) {
	if (isLoading) {
		return <Loader />;
	}

	if (isError) {
		return (
			<p className="py-10 text-center font-ui text-[16px] text-ink-muted leading-[24px]">
				暂时没能读取 GitHub 配置，稍后再试试吧。
			</p>
		);
	}

	if (integrations.length === 0) {
		return (
			<p className="rounded-[20px] bg-surface p-6 text-center font-ui text-[15px] text-ink-muted leading-[24px] ring-1 ring-outline/40">
				还没有保存的 GitHub token。
			</p>
		);
	}

	return (
		<section aria-label="已保存的 GitHub token" className="flex flex-col gap-4">
			{integrations.map((integration) => (
				<GithubIntegrationCard
					deleteError={deletingId === integration.id ? deleteError : undefined}
					integration={integration}
					isDeleting={isDeleting && deletingId === integration.id}
					isUpdating={isUpdating && updatingId === integration.id}
					key={integration.id}
					onDelete={onDelete}
					onUpdate={onUpdate}
					updateError={updatingId === integration.id ? updateError : undefined}
				/>
			))}
		</section>
	);
}

interface GithubIntegrationCardProps {
	deleteError?: string;
	integration: GithubIntegrationView;
	isDeleting: boolean;
	isUpdating: boolean;
	onDelete: (id: string) => void;
	onUpdate: (input: {
		id: string;
		label?: string | null;
		token?: string;
	}) => void;
	updateError?: string;
}

function GithubIntegrationCard({
	integration,
	isUpdating,
	isDeleting,
	updateError,
	deleteError,
	onUpdate,
	onDelete,
}: GithubIntegrationCardProps) {
	const [label, setLabel] = useState(integration.label ?? "");
	const [token, setToken] = useState("");
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const title = integration.name || integration.login || "GitHub account";
	const hasProfile = Boolean(integration.githubUserId && integration.login);

	const handleUpdate = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const nextToken = token.trim();
		onUpdate({
			id: integration.id,
			label: label.trim() || null,
			...(nextToken ? { token: nextToken } : {}),
		});
		if (nextToken) {
			setToken("");
		}
	};

	return (
		<article className="rounded-[20px] bg-surface p-6 shadow-[0_2px_16px_rgba(125,86,45,0.08)] ring-1 ring-outline/40">
			<div className="flex items-start gap-4">
				{integration.avatarUrl ? (
					<img
						alt={`${title} avatar`}
						className="h-12 w-12 shrink-0 rounded-full"
						height={48}
						src={integration.avatarUrl}
						width={48}
					/>
				) : (
					<div
						aria-hidden="true"
						className="h-12 w-12 shrink-0 rounded-full bg-surface-low"
					/>
				)}
				<div className="min-w-0 flex-1">
					<h2 className="truncate font-serif text-[20px] text-ink leading-[30px]">
						{title}
					</h2>
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-[13px] text-ink-muted">
						{integration.login ? <span>@{integration.login}</span> : null}
						{integration.githubUserId ? (
							<span>ID {integration.githubUserId}</span>
						) : null}
						<span>已保存 token</span>
						{integration.profileUrl ? (
							<a
								className="transition-colors hover:text-ink"
								href={integration.profileUrl}
								rel="noopener"
								target="_blank"
							>
								查看资料
							</a>
						) : null}
					</div>
					{hasProfile ? null : (
						<p className="mt-2 font-ui text-[#c25b4e] text-[13px] leading-[20px]">
							账户资料未同步。请在下方重新填入 token 并更新。
						</p>
					)}
				</div>
			</div>

			<form className="mt-6 flex flex-col gap-4" onSubmit={handleUpdate}>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="flex flex-col gap-2">
						<label
							className="font-ui text-[13px] text-ink-muted"
							htmlFor={`github-label-${integration.id}`}
						>
							名称
						</label>
						<input
							className="rounded-xl border border-outline bg-surface-high px-4 py-3 font-ui text-[15px] outline-none transition-colors focus:border-brand"
							id={`github-label-${integration.id}`}
							onChange={(event) => setLabel(event.target.value)}
							value={label}
						/>
					</div>
					<div className="flex flex-col gap-2">
						<label
							className="font-ui text-[13px] text-ink-muted"
							htmlFor={`github-token-${integration.id}`}
						>
							替换 token
						</label>
						<input
							autoComplete="off"
							className="rounded-xl border border-outline bg-surface-high px-4 py-3 font-ui text-[15px] outline-none transition-colors focus:border-brand"
							id={`github-token-${integration.id}`}
							onChange={(event) => setToken(event.target.value)}
							placeholder="留空则只更新名称"
							type="password"
							value={token}
						/>
					</div>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-3 border-outline/60 border-t pt-4">
					<div className="flex flex-wrap items-center gap-3">
						<button
							className="rounded-full bg-brand px-5 py-2.5 font-ui text-[14px] text-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
							disabled={isUpdating}
							type="submit"
						>
							{isUpdating ? "更新中..." : "更新"}
						</button>
						{updateError ? (
							<p className="font-ui text-[#c25b4e] text-[13px]">
								{updateError}
							</p>
						) : null}
					</div>
					<DeleteButton
						confirming={confirmingDelete}
						error={deleteError}
						isDeleting={isDeleting}
						onCancel={() => setConfirmingDelete(false)}
						onConfirm={() => onDelete(integration.id)}
						onStart={() => setConfirmingDelete(true)}
					/>
				</div>
			</form>
		</article>
	);
}

interface DeleteButtonProps {
	confirming: boolean;
	error?: string;
	isDeleting: boolean;
	onCancel: () => void;
	onConfirm: () => void;
	onStart: () => void;
}

function DeleteButton({
	confirming,
	isDeleting,
	error,
	onStart,
	onCancel,
	onConfirm,
}: DeleteButtonProps) {
	if (!confirming) {
		return (
			<button
				className="rounded-full px-4 py-2.5 font-ui text-[14px] text-ink-muted transition-colors hover:text-[#c25b4e]"
				onClick={onStart}
				type="button"
			>
				删除
			</button>
		);
	}

	return (
		<div className="flex flex-wrap items-center justify-end gap-2">
			<span className="font-ui text-[13px] text-ink-muted">确认删除？</span>
			<button
				className="rounded-full bg-[#c25b4e] px-4 py-2 font-ui text-[13px] text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
				disabled={isDeleting}
				onClick={onConfirm}
				type="button"
			>
				{isDeleting ? "删除中..." : "删除"}
			</button>
			<button
				className="rounded-full px-3 py-2 font-ui text-[13px] text-ink-muted transition-colors hover:text-ink"
				onClick={onCancel}
				type="button"
			>
				取消
			</button>
			{error ? (
				<p className="basis-full text-right font-ui text-[#c25b4e] text-[13px]">
					{error}
				</p>
			) : null}
		</div>
	);
}
