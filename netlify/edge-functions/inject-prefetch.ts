
/**
 * Netlify Edge Function: inject Speculation Rules and cross-document View
 * Transitions into every HTML response.
 *
 * Why
 * ---
 * 1. MyST `book-theme` static builds (`myst build --html`) do full document
 *    reloads on every link click — there's no SPA hydration in static mode
 *    (see jupyter-book/mystmd#188). That produces a visible white flash on
 *    same-site navigation. Speculation Rules with `eagerness: moderate`
 *    prefetch likely-next pages on hover so the click navigation is
 *    network-instant; cross-document View Transitions then crossfade between
 *    documents so the paint transition is also smooth.
 * 2. The top nav also links to sibling docs sites (GeoLab, CLI, SDK, API)
 *    served via Netlify rewrites to other Netlify deployments. Prefetching
 *    those is genuinely useful since the rewrite adds latency.
 *
 * Both features are progressive enhancements: browsers that don't support
 * Speculation Rules or cross-document View Transitions silently ignore them.
 * Today that's mainly Chromium-only support; Firefox and Safari just see a
 * normal MyST static build.
 *
 * How
 * ---
 * - Speculation Rules: scrape the embedded `"nav":[...]` blob from MyST's
 *   hydration data with a regex, normalize each entry to a same-origin path,
 *   emit `<script type="speculationrules">` for those paths plus `/*` wildcards.
 *   Same-origin normalization keeps staging/preview deploys self-contained.
 * - View Transitions: emit the standard opt-in
 *   `@view-transition { navigation: auto; }` plus a short crossfade duration
 *   so the transition is subtle rather than the default 250ms cross-fade.
 *
 * Caveats
 * -------
 * - Regex-scraping HTML is fragile. If MyST changes the embedded shape, we
 *   silently fall back to a hardcoded pattern list (FALLBACK_PATTERNS) so the
 *   site still works; the prefetch list just stops tracking nav changes until
 *   someone notices.
 * - Internal-vs-external host classification is hardcoded in isInternalDomain.
 *   Update it if new staging hosts are added.
 * - The cache is per-isolate (no cross-edge sharing) and has no TTL: nav
 *   changes produce a new cache key naturally, so stale entries just age out
 *   via FIFO eviction.
 * - This runs on every HTML response, including pages proxied from sibling
 *   sites via the redirects in netlify.toml. That means we inject our rules
 *   into HTML we don't own. Harmless, but worth knowing.
 */
import type { Context } from "https://edge.netlify.com";

const NAV_REGEX = /"nav":(\[(?:[^[\]]|\[[^\]]*\])*\])/;

const FALLBACK_PATTERNS = ["/", "/geolab", "/geolab/*", "/cli", "/cli/*", "/sdk", "/sdk/*", "/api", "/api/*"];

const FALLBACK_SCRIPT = buildSpeculationRules(FALLBACK_PATTERNS);

const scriptCache = new Map<string, string>();
const MAX_CACHE_ENTRIES = 16;

function getCachedScript(navJson: string, requestOrigin: string): string {
  const key = `${requestOrigin}\u0000${navJson}`;
  const hit = scriptCache.get(key);
  if (hit) return hit;

  const patterns = navJsonToPatterns(navJson, requestOrigin);
  const script = patterns.length > 0 ? buildSpeculationRules(patterns) : FALLBACK_SCRIPT;

  if (scriptCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = scriptCache.keys().next().value;
    if (oldestKey !== undefined) scriptCache.delete(oldestKey);
  }
  scriptCache.set(key, script);
  return script;
}

function navJsonToPatterns(navJson: string, requestOrigin: string): string[] {
  let nav: Array<{ url?: string }>;
  try {
    nav = JSON.parse(navJson);
  } catch {
    return [];
  }

  const paths = new Set<string>();
  for (const item of nav) {
    if (typeof item?.url !== "string") continue;
    let path = item.url;
    try {
      const parsed = new URL(path, requestOrigin);
      if (parsed.origin !== requestOrigin && !isInternalDomain(parsed.hostname)) {
        continue;
      }
      path = parsed.pathname || "/";
    } catch {
      // not a valid URL; assume already a path
    }
    if (!path.startsWith("/")) continue;
    paths.add(path);
    if (path !== "/") paths.add(`${path.replace(/\/$/, "")}/*`);
  }

  return [...paths];
}

function isInternalDomain(hostname: string): boolean {
  return hostname === "docs.earthscope.org" || hostname.endsWith(".netlify.app");
}

function buildSpeculationRules(patterns: string[]): string {
  const rules = {
    prefetch: [{ where: { href_matches: patterns }, eagerness: "moderate" }],
  };
  return `<script type="speculationrules">${JSON.stringify(rules)}</script>`;
}

const VIEW_TRANSITIONS_TAGS = [
  '<meta name="view-transition" content="same-origin">',
  '<style>@view-transition{navigation:auto}',
  '::view-transition-old(root),::view-transition-new(root){animation-duration:120ms}',
  '</style>',
].join("");

export default async (request: Request, context: Context) => {
  const response = await context.next();

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  const html = await response.text();
  const origin = new URL(request.url).origin;
  const navMatch = html.match(NAV_REGEX);
  const script = navMatch ? getCachedScript(navMatch[1], origin) : FALLBACK_SCRIPT;
  const headInjection = `${VIEW_TRANSITIONS_TAGS}${script}`;

  const injected = html.includes("</head>")
    ? html.replace("</head>", `${headInjection}\n</head>`)
    : headInjection + html;

  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return new Response(injected, {
    status: response.status,
    headers,
  });
};

export const config = {
  path: "/*",
};
