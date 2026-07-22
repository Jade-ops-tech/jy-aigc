import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

interface ImportMetaWithEnv {
	readonly env: Record<string, boolean | string | undefined>;
}

const runtimeEnv = (import.meta as ImportMetaWithEnv).env;
const defaultGoApiUrl = runtimeEnv.PROD
	? "https://mat3mddjkzrm2tbq6rrnd4mzsq0ejhuc.lambda-url.us-west-2.on.aws"
	: "http://localhost:3002";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_GO_API_URL: z.url().default(defaultGoApiUrl),
		VITE_SERVER_URL: z.url(),
	},
	runtimeEnv,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
