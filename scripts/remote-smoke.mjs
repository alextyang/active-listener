#!/usr/bin/env node

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_REQUEST_TIMEOUT_MS = 30 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 5000;
const MAX_REFRESH_ATTEMPTS = 4;

main().catch((error) => {
  console.error(formatError(error));
  process.exitCode = 1;
});

async function main() {
  const options = parseOptions(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const baseUrl = normalizeBaseUrl(resolveOption(options.baseUrl, process.env.BASE_URL, process.env.SMOKE_BASE_URL));
  const trackId = resolveOption(options.trackId, process.env.TRACK_ID, process.env.SMOKE_TRACK_ID);
  const timeoutMs = parsePositiveInteger(resolveOption(options.timeoutMs, process.env.SMOKE_TIMEOUT_MS), DEFAULT_TIMEOUT_MS, "timeout");
  const requestTimeoutMs = parsePositiveInteger(
    resolveOption(options.requestTimeoutMs, process.env.SMOKE_REQUEST_TIMEOUT_MS),
    DEFAULT_REQUEST_TIMEOUT_MS,
    "request timeout",
  );
  const pollIntervalMs = parsePositiveInteger(
    resolveOption(options.pollIntervalMs, process.env.SMOKE_POLL_INTERVAL_MS),
    DEFAULT_POLL_INTERVAL_MS,
    "poll interval",
  );

  if (!baseUrl) throw new Error("Missing BASE_URL. Set BASE_URL or SMOKE_BASE_URL.");
  if (!trackId) throw new Error("Missing TRACK_ID. Set TRACK_ID or SMOKE_TRACK_ID.");

  const smokeTarget = buildApiUrl(baseUrl, "api", "tracks", trackId);

  console.log(`[smoke] baseUrl=${baseUrl}`);
  console.log(`[smoke] trackId=${trackId}`);
  console.log(`[smoke] target=${smokeTarget}`);

  const initialView = await fetchTrackView(baseUrl, trackId, requestTimeoutMs);
  logView("initial GET", initialView);

  await refreshStage(baseUrl, trackId, "articles", requestTimeoutMs);
  const articlesReadyView = await waitForState(
    baseUrl,
    trackId,
    timeoutMs,
    pollIntervalMs,
    requestTimeoutMs,
    (view) => isArticlesReady(view),
    "articles stage",
  );
  logView("after articles refresh", articlesReadyView);

  await refreshStage(baseUrl, trackId, "summary", requestTimeoutMs);
  const finalView = await waitForState(
    baseUrl,
    trackId,
    timeoutMs,
    pollIntervalMs,
    requestTimeoutMs,
    isFullyReady,
    "summary stage",
  );
  logView("final GET", finalView);
  assertFullyReady(finalView);

  console.log("[smoke] passed");
}

function parseOptions(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }

    if (token === "--base-url") {
      options.baseUrl = next;
      index += 1;
      continue;
    }

    if (token === "--track-id") {
      options.trackId = next;
      index += 1;
      continue;
    }

    if (token === "--timeout-ms") {
      options.timeoutMs = next;
      index += 1;
      continue;
    }

    if (token === "--request-timeout-ms") {
      options.requestTimeoutMs = next;
      index += 1;
      continue;
    }

    if (token === "--poll-interval-ms") {
      options.pollIntervalMs = next;
      index += 1;
      continue;
    }

    if (!token.startsWith("--") && !options.baseUrl) {
      options.baseUrl = token;
      continue;
    }

    if (!token.startsWith("--") && !options.trackId) {
      options.trackId = token;
      continue;
    }
  }

  return options;
}

async function fetchTrackView(baseUrl, trackId, requestTimeoutMs) {
  const response = await fetchWithTimeout(buildApiUrl(baseUrl, "api", "tracks", trackId), {
    method: "GET",
    requestTimeoutMs,
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(formatResponseError("GET /api/tracks/:id", response, payload));
  }

  assertTrackView(payload, "GET /api/tracks/:id");
  return payload;
}

async function refreshStage(baseUrl, trackId, stage, requestTimeoutMs) {
  for (let attempt = 1; attempt <= MAX_REFRESH_ATTEMPTS; attempt += 1) {
    const response = await fetchWithTimeout(buildApiUrl(baseUrl, "api", "tracks", trackId, "refresh"), {
      method: "POST",
      requestTimeoutMs,
      headers: {
        "content-type": "application/json",
        origin: baseUrl,
      },
      body: JSON.stringify({ stage, force: true }),
    });

    const payload = await readJson(response);
    if (response.status === 429) {
      const retryAfterSeconds = parseRetryAfter(response.headers.get("retry-after"));
      console.warn(
        `[smoke] refresh ${stage} rate-limited on attempt ${attempt}/${MAX_REFRESH_ATTEMPTS}; retrying in ${retryAfterSeconds}s`,
      );
      await sleep(retryAfterSeconds * 1000);
      continue;
    }

    if (!response.ok) {
      throw new Error(formatResponseError(`POST /api/tracks/:id/refresh (${stage})`, response, payload));
    }

    assertTrackView(payload, `POST /api/tracks/:id/refresh (${stage})`);
    return payload;
  }

  throw new Error(`POST /api/tracks/:id/refresh (${stage}) was rate-limited too many times`);
}

async function waitForState(baseUrl, trackId, timeoutMs, pollIntervalMs, requestTimeoutMs, predicate, label) {
  const startedAt = Date.now();
  let lastView;

  while (Date.now() - startedAt <= timeoutMs) {
    lastView = await fetchTrackView(baseUrl, trackId, requestTimeoutMs);
    if (predicate(lastView)) return lastView;
    await sleep(pollIntervalMs);
  }

  throw new Error(`Timed out waiting for ${label} to become ready. Last view: ${formatView(lastView)}`);
}

function isArticlesReady(view) {
  return view.status?.metadata?.status === "ready" && view.status?.articles?.status === "ready" && Array.isArray(view.articles) && view.articles.length > 0;
}

function isFullyReady(view) {
  return (
    view.status?.metadata?.status === "ready" &&
    view.status?.articles?.status === "ready" &&
    view.status?.summary?.status === "ready" &&
    Array.isArray(view.articles) &&
    view.articles.length > 0 &&
    typeof getSummaryText(view.summary) === "string" &&
    getSummaryText(view.summary).trim().length > 0
  );
}

function assertFullyReady(view) {
  if (!isFullyReady(view)) {
    throw new Error(`Track view never reached ready state. Last view: ${formatView(view)}`);
  }
}

function assertTrackView(view, context) {
  if (!view || typeof view !== "object") {
    throw new Error(`${context} did not return a JSON object`);
  }

  if (typeof view.trackId !== "string" || !view.trackId.trim()) {
    throw new Error(`${context} did not include a trackId`);
  }

  if (!view.status || typeof view.status !== "object") {
    throw new Error(`${context} did not include status information`);
  }
}

function logView(label, view) {
  console.log(`[smoke] ${label}: ${formatView(view)}`);
}

function formatResponseError(context, response, payload) {
  const requestId = response.headers.get("x-request-id");
  const retryAfter = response.headers.get("retry-after");
  const body = payload && typeof payload === "object" ? JSON.stringify(payload) : String(payload ?? "");

  return [
    `${context} failed with status ${response.status}`,
    requestId ? `requestId=${requestId}` : null,
    retryAfter ? `retryAfter=${retryAfter}` : null,
    body ? `payload=${body}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

function getSummaryText(summary) {
  if (!summary) return "";
  if (typeof summary === "string") return summary;
  if (typeof summary.text === "string") return summary.text;
  return "";
}

function formatView(view) {
  if (!view) return "null";
  return JSON.stringify(
    {
      trackId: view.trackId,
      status: view.status,
      articles: Array.isArray(view.articles) ? view.articles.length : undefined,
      summary: getSummaryText(view.summary).slice(0, 120),
      lastError: view.lastError ?? null,
    },
    null,
    2,
  );
}

async function fetchWithTimeout(url, init = {}) {
  const { requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, signal, ...rest } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`Timed out after ${requestTimeoutMs}ms`)), requestTimeoutMs);

  const onAbort = () => controller.abort(signal.reason ?? new Error("Aborted"));
  if (signal) {
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    return await fetch(url, {
      ...rest,
      signal: controller.signal,
    });
  } catch (error) {
    throw new Error(`Request to ${url} failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

async function readJson(response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function buildApiUrl(baseUrl, ...segments) {
  const url = new URL(baseUrl);
  const basePath = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  url.pathname = `${basePath}/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
  return url.toString();
}

function ensureTrailingSlash(baseUrl) {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function normalizeBaseUrl(value) {
  if (!value) return value;
  const parsed = new URL(value);
  parsed.pathname = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/$/, "");
  return parsed.toString().replace(/\/$/, parsed.pathname === "/" ? "/" : "");
}

function resolveOption(...candidates) {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && String(candidate).trim()) {
      return String(candidate).trim();
    }
  }
  return "";
}

function parsePositiveInteger(value, fallback, label) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label} value: ${value}`);
  }
  return Math.floor(parsed);
}

function parseRetryAfter(value) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 5;
}

function printHelp() {
  console.log(`Usage:
  npm run smoke:remote -- --base-url <url> --track-id <spotify-track-id>

Required:
  BASE_URL or SMOKE_BASE_URL
  TRACK_ID or SMOKE_TRACK_ID

Optional:
  --timeout-ms <ms>             Overall wait for ready states (default: ${DEFAULT_TIMEOUT_MS})
  --request-timeout-ms <ms>     Per-request timeout (default: ${DEFAULT_REQUEST_TIMEOUT_MS})
  --poll-interval-ms <ms>       Poll interval between GET checks (default: ${DEFAULT_POLL_INTERVAL_MS})

Examples:
  BASE_URL=https://example.com TRACK_ID=3n3Ppam7vgaVa1iaRUc9Lp npm run smoke:remote
  npm run smoke:remote -- --base-url http://127.0.0.1:3000 --track-id 3n3Ppam7vgaVa1iaRUc9Lp
`);
}

function formatError(error) {
  if (error instanceof Error) {
    return error.stack || error.message;
  }

  return String(error);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
