import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const KEY_VERSION_PATTERN = /^v\d+$/;
const BASE64_KEY_BYTE_LENGTH = 32;

export interface EncryptionKey {
	key: Buffer;
	version: string;
}

export interface EncryptionKeyring {
	current: EncryptionKey;
	keys: Map<string, Buffer>;
}

function parseBase64Key(value: string): Buffer | null {
	const key = Buffer.from(value, "base64");
	return key.length === BASE64_KEY_BYTE_LENGTH ? key : null;
}

function parseEncryptionKeyring(value: string): EncryptionKeyring {
	const rawEntries = value.includes(":") ? value.split(",") : [`v1:${value}`];
	const entries: EncryptionKey[] = [];

	for (const rawEntry of rawEntries) {
		const [version, rawKey] = rawEntry.split(":");
		if (!(version && rawKey && KEY_VERSION_PATTERN.test(version))) {
			throw new Error(
				"GITHUB_TOKEN_ENCRYPTION_KEY must use vN:<base64-32B> entries"
			);
		}

		const key = parseBase64Key(rawKey);
		if (!key) {
			throw new Error(
				"GITHUB_TOKEN_ENCRYPTION_KEY entries must decode to 32 bytes"
			);
		}

		entries.push({ version, key });
	}

	if (entries.length === 0) {
		throw new Error("GITHUB_TOKEN_ENCRYPTION_KEY is required");
	}

	const keys = new Map(entries.map((entry) => [entry.version, entry.key]));
	const current = entries.at(-1);
	if (!current) {
		throw new Error("GITHUB_TOKEN_ENCRYPTION_KEY is required");
	}

	return { current, keys };
}

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1).optional(),
		DATABASE_HOST: z.string().min(1).optional(),
		DATABASE_PORT: z.coerce.number().int().positive().default(5432),
		DATABASE_NAME: z.string().min(1).optional(),
		DATABASE_USER: z.string().min(1).optional(),
		DATABASE_PASSWORD: z.string().min(1).optional(),
		DATABASE_POOL_MAX: z.coerce.number().int().positive().default(2),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url().optional(),
		CORS_ORIGIN: z.url(),
		GITHUB_TOKEN_ENCRYPTION_KEY: z
			.string()
			.min(1)
			.transform(parseEncryptionKeyring),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
