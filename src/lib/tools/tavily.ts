import type { SearchResult } from "@/lib/agent/mockData";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const TAVILY_EXTRACT_URL = "https://api.tavily.com/extract";

export class TavilyApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "TavilyApiError";
    this.status = status;
  }
}

export function isTavilyConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}

export function getTavilyApiKey(): string {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new TavilyApiError("TAVILY_API_KEY is not configured");
  return key;
}

interface TavilySearchResultRaw {
  title?: string;
  url: string;
  content?: string;
  published_date?: string;
}

/** Real web search via the Tavily Search API. */
export async function tavilySearch(query: string, maxResults = 3): Promise<SearchResult[]> {
  const apiKey = getTavilyApiKey();

  let res: Response;
  try {
    res = await fetch(TAVILY_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: maxResults,
        include_answer: false,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    throw new TavilyApiError(err instanceof Error ? err.message : "Network error while calling Tavily Search");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TavilyApiError(`Tavily search failed: ${body || res.statusText}`, res.status);
  }

  const data = (await res.json()) as { results?: TavilySearchResultRaw[] };
  const results = data.results ?? [];

  return results.map((r) => {
    let hostname = r.url;
    try {
      hostname = new URL(r.url).hostname.replace(/^www\./, "");
    } catch {
      // keep raw url as source if it fails to parse
    }
    return {
      title: r.title ?? r.url,
      url: r.url,
      source: hostname,
      publishedAt: r.published_date ?? "",
      snippet: (r.content ?? "").slice(0, 240),
    };
  });
}

export interface ExtractResult {
  url: string;
  content: string;
}

/** Real page-content extraction via the Tavily Extract API. Supports an
 * overridden (possibly invalid) API key and a custom timeout so the demo
 * scenario selector can trigger *genuine* auth/timeout failures against
 * Tavily's real endpoint rather than faking them locally. */
export async function tavilyExtract(
  url: string,
  opts: { apiKeyOverride?: string; timeoutMs?: number } = {}
): Promise<ExtractResult> {
  const apiKey = opts.apiKeyOverride ?? getTavilyApiKey();
  const timeoutMs = opts.timeoutMs ?? 15000;

  let res: Response;
  try {
    res = await fetch(TAVILY_EXTRACT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, urls: [url] }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new TavilyApiError(
        `Request timed out after ${timeoutMs}ms with no response from the external API.`,
        504
      );
    }
    throw new TavilyApiError(err instanceof Error ? err.message : "Network error while calling Tavily Extract");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TavilyApiError(`Tavily extract failed: ${body || res.statusText}`, res.status);
  }

  const data = (await res.json()) as { results?: { url: string; raw_content?: string }[] };
  const first = data.results?.[0];
  if (!first) {
    throw new TavilyApiError("Tavily extract returned no content for this URL", 502);
  }

  return { url: first.url, content: (first.raw_content ?? "").slice(0, 4000) };
}
