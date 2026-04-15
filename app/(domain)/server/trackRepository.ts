import { mkdir, readFile, rename, unlink, writeFile } from "fs/promises";
import path from "path";
import postgres from "postgres";
import { PersistedTrackRecord } from "../app/types";
import { getServerEnv } from "./env";
import { applyMigrations } from "../../../db/migrations.js";

export interface TrackRepository {
    get(trackId: string): Promise<PersistedTrackRecord | undefined>;
    set(record: PersistedTrackRecord): Promise<void>;
}

type FileStore = {
    tracks: Record<string, PersistedTrackRecord>;
};

export class FileTrackRepository implements TrackRepository {
    private writeQueue = Promise.resolve();

    constructor(private readonly filePath: string) { }

    async get(trackId: string): Promise<PersistedTrackRecord | undefined> {
        const store = await this.readStore();
        return store.tracks[trackId];
    }

    async set(record: PersistedTrackRecord): Promise<void> {
        await this.runExclusive(async () => {
            const store = await this.readStore();
            store.tracks[record.trackId] = record;
            await mkdir(path.dirname(this.filePath), { recursive: true });
            const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
            await writeFile(tempPath, JSON.stringify(store, null, 2), "utf8");
            try {
                await rename(tempPath, this.filePath);
            } catch (error: unknown) {
                await unlink(tempPath).catch(() => undefined);
                throw error;
            }
        });
    }

    private async readStore(): Promise<FileStore> {
        try {
            const raw = await readFile(this.filePath, "utf8");
            const parsed = JSON.parse(raw) as Partial<FileStore>;
            if (!parsed || typeof parsed !== "object" || !parsed.tracks || typeof parsed.tracks !== "object")
                return { tracks: {} };
            return { tracks: parsed.tracks as Record<string, PersistedTrackRecord> };
        } catch (error) {
            if (isNotFoundError(error))
                return { tracks: {} };
            throw error;
        }
    }

    private async runExclusive<T>(work: () => Promise<T>) {
        const next = this.writeQueue.then(work, work);
        this.writeQueue = next.then(() => undefined, () => undefined);
        return next;
    }
}

export class PostgresTrackRepository implements TrackRepository {
    private readyPromise: Promise<void> | undefined;

    constructor(private readonly sql: postgres.Sql) { }

    async get(trackId: string): Promise<PersistedTrackRecord | undefined> {
        await this.ensureReady();
        const rows = await this.sql<{ document: PersistedTrackRecord }[]>`
            select document
            from active_listener_tracks
            where track_id = ${trackId}
            limit 1
        `;
        return rows[0]?.document;
    }

    async set(record: PersistedTrackRecord): Promise<void> {
        await this.ensureReady();
        await this.sql`
            insert into active_listener_tracks (track_id, document, updated_at)
            values (${record.trackId}, ${this.sql.json(JSON.parse(JSON.stringify(record)) as any)}, now())
            on conflict (track_id)
            do update set
                document = excluded.document,
                updated_at = excluded.updated_at
        `;
    }

    private async ensureReady() {
        if (!this.readyPromise) {
            this.readyPromise = applyMigrations(this.sql).catch((error) => {
                this.readyPromise = undefined;
                throw error;
            });
        }

        await this.readyPromise;
    }
}

export function createFileTrackRepository(filePath: string): TrackRepository {
    return new FileTrackRepository(filePath);
}

export function createPostgresTrackRepository(sql: postgres.Sql): TrackRepository {
    return new PostgresTrackRepository(sql);
}

let repository: TrackRepository | undefined;

export function getTrackRepository(): TrackRepository {
    if (repository) return repository;

    const env = getServerEnv();
    if (env.DATABASE_URL) {
        repository = createPostgresTrackRepository(postgres(env.DATABASE_URL, { prepare: false }));
        return repository;
    }

    const dataPath = env.ACTIVE_LISTENER_DATA_PATH
        ? path.resolve(process.cwd(), env.ACTIVE_LISTENER_DATA_PATH)
        : path.resolve(process.cwd(), ".cache/active-listener-store.json");

    repository = createFileTrackRepository(dataPath);
    return repository;
}

function isNotFoundError(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT";
}
