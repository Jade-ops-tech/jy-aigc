import { createHash } from "node:crypto";
import { Pool, type PoolClient, type PoolConfig } from "pg";

import migration0000 from "../../../packages/db/src/migrations/0000_living_network.sql";
import migration0001 from "../../../packages/db/src/migrations/0001_github_integration.sql";

const STATEMENT_BREAKPOINT = "--> statement-breakpoint";
const MIGRATION_SCHEMA = "drizzle";
const MIGRATION_TABLE = "__drizzle_migrations";
const PHYSICAL_RESOURCE_ID = "jy-aigc-database-migrations";

interface Migration {
	createdAt: number;
	hash: string;
	sql: string;
}

interface MigrationEvent {
	LogicalResourceId: string;
	RequestId: string;
	RequestType: "Create" | "Delete" | "Update";
	ResponseURL: string;
	StackId: string;
}

const migration = (sql: string, createdAt: number): Migration => ({
	createdAt,
	hash: createHash("sha256").update(sql).digest("hex"),
	sql,
});

const migrations = [
	migration(migration0000, 1_783_077_343_565),
	migration(migration0001, 1_783_180_000_000),
];

const ensureMigrationTable = async (client: PoolClient): Promise<void> => {
	await client.query(`CREATE SCHEMA IF NOT EXISTS ${MIGRATION_SCHEMA}`);
	await client.query(
		`CREATE TABLE IF NOT EXISTS ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`
	);
};

const applyMigration = async (
	client: PoolClient,
	entry: Migration
): Promise<void> => {
	const existing = await client.query<{ id: number }>(
		`SELECT id FROM ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} WHERE hash = $1 LIMIT 1`,
		[entry.hash]
	);

	if (existing.rowCount) {
		return;
	}

	for (const statement of entry.sql.split(STATEMENT_BREAKPOINT)) {
		const trimmedStatement = statement.trim();
		if (trimmedStatement) {
			await client.query(trimmedStatement);
		}
	}

	await client.query(
		`INSERT INTO ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (hash, created_at) VALUES ($1, $2)`,
		[entry.hash, entry.createdAt]
	);
};

const applyMigrations = async (): Promise<void> => {
	const connectionString = process.env.DATABASE_URL;
	const poolConfig: PoolConfig = connectionString
		? { connectionString }
		: {
				host: process.env.DATABASE_HOST,
				port: Number(process.env.DATABASE_PORT ?? "5432"),
				database: process.env.DATABASE_NAME,
				user: process.env.DATABASE_USER,
				password: process.env.DATABASE_PASSWORD,
				ssl: { rejectUnauthorized: false },
			};

	if (
		!(poolConfig.connectionString || (poolConfig.host && poolConfig.password))
	) {
		throw new Error(
			"DATABASE_URL or DATABASE_HOST and DATABASE_PASSWORD are required"
		);
	}

	const pool = new Pool({ ...poolConfig, max: 1 });
	const client = await pool.connect();

	try {
		await client.query("BEGIN");
		await ensureMigrationTable(client);
		for (const entry of migrations) {
			await applyMigration(client, entry);
		}
		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
		await pool.end();
	}
};

const sendResponse = async (
	event: MigrationEvent,
	status: "FAILED" | "SUCCESS",
	reason: string
): Promise<void> => {
	const body = JSON.stringify({
		Status: status,
		Reason: reason,
		PhysicalResourceId: PHYSICAL_RESOURCE_ID,
		StackId: event.StackId,
		RequestId: event.RequestId,
		LogicalResourceId: event.LogicalResourceId,
		NoEcho: false,
		Data: {},
	});

	const response = await fetch(event.ResponseURL, {
		method: "PUT",
		headers: { "content-type": "" },
		body,
	});

	if (!response.ok) {
		throw new Error(`CloudFormation response failed with ${response.status}`);
	}
};

export const handler = async (event: MigrationEvent): Promise<void> => {
	try {
		if (event.RequestType !== "Delete") {
			await applyMigrations();
		}
		await sendResponse(event, "SUCCESS", "Database migrations are current");
	} catch (error) {
		const reason = error instanceof Error ? error.message : "Migration failed";
		await sendResponse(event, "FAILED", reason);
	}
};
