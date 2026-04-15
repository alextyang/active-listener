const { createHash } = require("node:crypto");
const { readFile, readdir } = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_MIGRATIONS_DIR = path.resolve(process.cwd(), "db/migrations");
const MIGRATIONS_TABLE = "active_listener_schema_migrations";

function checksum(contents) {
    return createHash("sha256").update(contents, "utf8").digest("hex");
}

async function listMigrationFiles(migrationsDir) {
    const entries = await readdir(migrationsDir, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));
}

async function ensureMigrationsTable(sql) {
    await sql.unsafe(`
        create table if not exists ${MIGRATIONS_TABLE} (
            version text primary key,
            checksum text not null,
            applied_at timestamptz not null default now()
        )
    `);
}

async function readAppliedMigrations(sql) {
    const rows = await sql.unsafe(`
        select version, checksum
        from ${MIGRATIONS_TABLE}
        order by version
    `);

    return new Map(rows.map((row) => [row.version, row.checksum]));
}

async function applyMigrations(sql, options = {}) {
    const migrationsDir = options.migrationsDir ?? DEFAULT_MIGRATIONS_DIR;

    await sql.begin(async (tx) => {
        await tx.unsafe(`
            select pg_advisory_xact_lock(hashtext('${MIGRATIONS_TABLE}'))
        `);

        await ensureMigrationsTable(tx);
        const appliedMigrations = await readAppliedMigrations(tx);
        const migrationFiles = await listMigrationFiles(migrationsDir);

        for (const fileName of migrationFiles) {
            const filePath = path.join(migrationsDir, fileName);
            const contents = await readFile(filePath, "utf8");
            const fileChecksum = checksum(contents);
            const appliedChecksum = appliedMigrations.get(fileName);

            if (appliedChecksum) {
                if (appliedChecksum !== fileChecksum) {
                    throw new Error(`Migration checksum mismatch for ${fileName}`);
                }
                continue;
            }

            await tx.unsafe(contents);
            await tx`
                insert into active_listener_schema_migrations (version, checksum)
                values (${fileName}, ${fileChecksum})
            `;

            appliedMigrations.set(fileName, fileChecksum);
        }
    });
}

module.exports = {
    DEFAULT_MIGRATIONS_DIR,
    MIGRATIONS_TABLE,
    applyMigrations,
    checksum,
    listMigrationFiles,
};
