import { z } from "zod";

const serverEnvSchema = z.object({
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID: z.string().optional(),
    SPOTIFY_CLIENT_ID: z.string().optional(),
    SPOTIFY_CLIENT_SECRET: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z.string().optional(),
    APP_ORIGIN: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    GOOGLE_API_KEY: z.string().optional(),
    GOOGLE_SEARCH_ENGINE_ID: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    ACTIVE_LISTENER_DATA_PATH: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
    if (!cachedEnv)
        cachedEnv = serverEnvSchema.parse(process.env);
    return cachedEnv;
}

export function getAppOrigin(): string {
    const env = getServerEnv();
    const configured = env.APP_ORIGIN ?? env.NEXT_PUBLIC_APP_URL;
    if (configured)
        return normalizeOrigin(configured);

    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl)
        return normalizeOrigin(vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`);

    return "http://127.0.0.1:3000";
}

export function getSpotifyRedirectUri(pathname = "/"): string {
    return new URL(pathname, ensureTrailingSlash(getAppOrigin())).toString();
}

function normalizeOrigin(value: string): string {
    const trimmed = value.trim().replace(/\/+$/, "");
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
        return trimmed;
    return `https://${trimmed}`;
}

function ensureTrailingSlash(value: string): string {
    return value.endsWith("/") ? value : `${value}/`;
}
