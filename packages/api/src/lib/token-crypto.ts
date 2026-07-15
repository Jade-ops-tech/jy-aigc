import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@jy-aigc/env/server";

const ALGORITHM = "aes-256-gcm";
const IV_BYTE_LENGTH = 12;

export interface EncryptedToken {
	authTag: string;
	ciphertext: string;
	iv: string;
	keyVersion: string;
}

export function encryptToken(plaintext: string): EncryptedToken {
	const keyring = env.GITHUB_TOKEN_ENCRYPTION_KEY;
	const iv = randomBytes(IV_BYTE_LENGTH);
	const cipher = createCipheriv(ALGORITHM, keyring.current.key, iv);
	const ciphertext = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();

	return {
		authTag: authTag.toString("base64"),
		ciphertext: ciphertext.toString("base64"),
		iv: iv.toString("base64"),
		keyVersion: keyring.current.version,
	};
}

export function decryptToken(encrypted: EncryptedToken): string {
	const key = env.GITHUB_TOKEN_ENCRYPTION_KEY.keys.get(encrypted.keyVersion);
	if (!key) {
		throw new Error("Unknown GitHub token encryption key version");
	}

	const decipher = createDecipheriv(
		ALGORITHM,
		key,
		Buffer.from(encrypted.iv, "base64")
	);
	decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));

	return Buffer.concat([
		decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
		decipher.final(),
	]).toString("utf8");
}

export function needsTokenReencryption(keyVersion: string): boolean {
	return keyVersion !== env.GITHUB_TOKEN_ENCRYPTION_KEY.current.version;
}
