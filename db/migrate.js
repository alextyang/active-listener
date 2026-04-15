const { readFileSync } = require("node:fs");
const postgres = require("postgres");
const { applyMigrations, DEFAULT_MIGRATIONS_DIR } = require("./migrations");

loadEnvFile(".env.local");
loadEnvFile(".env");

async function main() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is required to run migrations");
    }

    const sql = postgres(databaseUrl, { prepare: false });
    try {
        await applyMigrations(sql, { migrationsDir: DEFAULT_MIGRATIONS_DIR });
        console.log(`Applied migrations from ${DEFAULT_MIGRATIONS_DIR}`);
    } finally {
        await sql.end({ timeout: 5 });
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});

function loadEnvFile(filePath) {
    try {
        const raw = readFileSync(filePath, "utf8");
        for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("="))
                continue;

            const equalsIndex = trimmed.indexOf("=");
            const key = trimmed.slice(0, equalsIndex).trim();
            if (!key || process.env[key] !== undefined)
                continue;

            let value = trimmed.slice(equalsIndex + 1).trim();
            if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'")))
                value = value.slice(1, -1);

            process.env[key] = value;
        }
    } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT")
            throw error;
    }
}
