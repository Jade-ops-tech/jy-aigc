import { createFileRoute } from "@tanstack/react-router";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/login")({
	component: RouteComponent,
	validateSearch: (
		search: Record<string, unknown>
	): { mode?: "sign-in" | "sign-up" } => {
		if (search.mode === "sign-in" || search.mode === "sign-up") {
			return { mode: search.mode };
		}

		return {};
	},
});

function RouteComponent() {
	const { mode } = Route.useSearch();
	const navigate = Route.useNavigate();

	return mode === "sign-in" ? (
		<SignInForm
			onSwitchToSignUp={() => navigate({ search: { mode: "sign-up" } })}
		/>
	) : (
		<SignUpForm
			onSwitchToSignIn={() => navigate({ search: { mode: "sign-in" } })}
		/>
	);
}
