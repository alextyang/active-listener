import type postgres from "postgres";

export const DEFAULT_MIGRATIONS_DIR: string;
export const MIGRATIONS_TABLE: string;

export function checksum(contents: string): string;
export function listMigrationFiles(migrationsDir: string): Promise<string[]>;
export function applyMigrations(
    sql: postgres.Sql,
    options?: { migrationsDir?: string }
): Promise<void>;
