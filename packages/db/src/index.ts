import { env } from "@jy-aigc/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import * as schema from "./schema";

export function createDb() {
	const poolConfig: PoolConfig = env.DATABASE_URL
		? { connectionString: env.DATABASE_URL }
		: {
				host: env.DATABASE_HOST,
				port: env.DATABASE_PORT,
				database: env.DATABASE_NAME,
				user: env.DATABASE_USER,
				password: env.DATABASE_PASSWORD,
				ssl: { rejectUnauthorized: false },
			};

	if (
		!(poolConfig.connectionString || (poolConfig.host && poolConfig.password))
	) {
		throw new Error(
			"DATABASE_URL or DATABASE_HOST and DATABASE_PASSWORD are required"
		);
	}

	const client = new Pool({
		...poolConfig,
		max: env.DATABASE_POOL_MAX,
	});

	return drizzle({ client, schema });
}

export const db = createDb();
