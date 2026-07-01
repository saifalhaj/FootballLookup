// ponytail: in-memory per-instance fixed-window limiter. Enough to stop one
// demo tab from burning the API quota. On multi-instance serverless each
// instance keeps its own window — swap for Upstash/Vercel KV if a global cap
// across instances is ever needed.

type Entry = { count: number; reset: number };
const hits = new Map<string, Entry>();

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfter?: number; // seconds
}

export function rateLimit(ip: string, limit = 30, windowMs = 60_000): RateResult {
  const now = Date.now();

  // Bound the map: drop expired entries first; if a flood of unique keys still
  // keeps it over the hard cap, evict oldest-by-insertion until back under.
  const MAX = 10_000;
  if (hits.size > MAX) {
    for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
    let over = hits.size - MAX;
    for (const k of hits.keys()) {
      if (over <= 0) break;
      hits.delete(k);
      over--;
    }
  }

  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (entry.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true, remaining: limit - entry.count };
}

/**
 * Best-effort client IP. Prefer x-real-ip — the platform (Vercel) sets it to
 * the real connecting IP, so it can't be spoofed like the client-controlled
 * leftmost x-forwarded-for entry. Fall back to the rightmost XFF hop (the one
 * the proxy appended), then to a constant.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",");
    return parts[parts.length - 1]!.trim();
  }
  return "local";
}
