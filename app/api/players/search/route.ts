import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { ApiError } from "@/lib/providers/apiFootball";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const rl = rateLimit(clientIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "You're searching a lot — give it a few seconds." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 30) } },
    );
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  // API-Football's name search needs at least 3 characters.
  if (q.length < 3) return NextResponse.json({ results: [] });

  try {
    const results = await getProvider().search(q);
    return NextResponse.json({ results: results.slice(0, 12) });
  } catch (e) {
    const err = e instanceof ApiError ? e : new ApiError("Something went wrong. Try again.", 500);
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
}
