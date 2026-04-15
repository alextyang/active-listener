import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import postgres from "postgres";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { applyMigrations } from "../../../db/migrations.js";
import { CompleteArticle, PersistedTrackRecord } from "../app/types";
import { createPostgresTrackRepository } from "./trackRepository";

const databaseUrl = process.env.DATABASE_URL;
const testTrackPrefix = "vitest-track:";

describe.runIf(Boolean(databaseUrl))("createPostgresTrackRepository", () => {
    let sql: postgres.Sql;

    beforeAll(async () => {
        sql = postgres(databaseUrl!, { prepare: false });
        await applyMigrations(sql);
    });

    beforeEach(async () => {
        await sql`
            delete from active_listener_tracks
            where track_id like ${testTrackPrefix + "%"}
        `;
    });

    afterAll(async () => {
        await sql`
            delete from active_listener_tracks
            where track_id like ${testTrackPrefix + "%"}
        `;
        await sql.end({ timeout: 5 });
    });

    it("round-trips records through postgres", async () => {
        const repository = createPostgresTrackRepository(sql);
        const record = makeRecord("vitest-track:round-trip");

        await repository.set(record);
        await expect(repository.get(record.trackId)).resolves.toEqual(record);
    });

    it("overwrites the existing record on conflict", async () => {
        const repository = createPostgresTrackRepository(sql);
        const original = makeRecord("vitest-track:upsert");
        const updated = {
            ...original,
            articles: [{ ...original.articles![0], title: "Updated title", excerptHash: "updated-hash" }],
            updatedAt: "2026-04-13T01:00:00.000Z",
        };

        await repository.set(original);
        await repository.set(updated);

        await expect(repository.get(original.trackId)).resolves.toEqual(updated);
    });

    it("returns undefined for missing tracks", async () => {
        const repository = createPostgresTrackRepository(sql);

        await expect(repository.get("vitest-track:missing")).resolves.toBeUndefined();
    });

    it("applies migrations idempotently and records checksums", async () => {
        const before = await sql<{ count: number }[]>`
            select count(*)::int as count
            from active_listener_schema_migrations
        `;

        await applyMigrations(sql);

        const after = await sql<{ count: number }[]>`
            select count(*)::int as count
            from active_listener_schema_migrations
        `;

        expect(after[0].count).toBe(before[0].count);
    });

    it("rejects checksum drift for an already applied migration", async () => {
        const migrationDir = await mkdtemp(path.join(os.tmpdir(), "active-listener-migrations-"));
        const migrationFile = path.join(migrationDir, "9999_vitest_checksum.sql");

        try {
            await writeFile(migrationFile, `
                create table if not exists vitest_checksum_guard (
                    id text primary key
                );
            `, "utf8");

            await applyMigrations(sql, { migrationsDir: migrationDir });

            await writeFile(migrationFile, `
                create table if not exists vitest_checksum_guard (
                    id text primary key,
                    updated_at timestamptz not null default now()
                );
            `, "utf8");

            await expect(applyMigrations(sql, { migrationsDir: migrationDir })).rejects.toThrow(/checksum mismatch/i);
        } finally {
            await sql`
                delete from active_listener_schema_migrations
                where version = ${"9999_vitest_checksum.sql"}
            `;
            await sql.unsafe(`drop table if exists vitest_checksum_guard`);
            await rm(migrationDir, { recursive: true, force: true });
        }
    });
});

function makeRecord(trackId: string): PersistedTrackRecord {
    const article: CompleteArticle = {
        link: "https://example.com/review",
        title: "Review",
        excerpt: "A review of the track.",
        excerptHash: "hash-1",
        siteName: "Example",
        byline: "Author",
        type: "article",
        relevance: "track",
        wordCount: 250,
        updatedAt: "2026-04-13T00:00:00.000Z",
    };

    return {
        trackId,
        metadata: {
            track: {
                id: trackId,
                name: "Track",
                album: { id: "album-1", name: "Album", images: [] },
                artists: [{ id: "artist-1", name: "Artist" }],
            } as never,
        },
        metadataHash: "metadata-hash",
        articles: [article],
        articlesHash: "articles-hash",
        summary: {
            text: "summary",
            model: "gpt-4o-mini",
            promptVersion: "v1",
            inputHash: "input-hash",
            updatedAt: "2026-04-13T00:00:00.000Z",
        },
        status: {
            metadata: { status: "ready", updatedAt: "2026-04-13T00:00:00.000Z" },
            articles: { status: "ready", updatedAt: "2026-04-13T00:00:00.000Z" },
            summary: { status: "ready", updatedAt: "2026-04-13T00:00:00.000Z" },
        },
        createdAt: "2026-04-13T00:00:00.000Z",
        updatedAt: "2026-04-13T00:00:00.000Z",
    };
}
