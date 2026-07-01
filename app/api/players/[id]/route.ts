import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { ApiError } from "@/lib/providers/apiFootball";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(clientIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "You're going fast — give it a few seconds." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 30) } },
    );
  }

  const { id } = await ctx.params;
  const playerId = Number(id);
  if (!Number.isInteger(playerId) || playerId <= 0) {
    return NextResponse.json({ error: "That player id doesn't look right." }, { status: 400 });
  }

  const seasonParam = new URL(req.url).searchParams.get("season");
  const parsed = seasonParam ? Number(seasonParam) : NaN;
  // Ignore a malformed / out-of-range season and fall back to the default.
  const season =
    Number.isInteger(parsed) && parsed >= 2000 && parsed <= new Date().getFullYear() + 1
      ? parsed
      : undefined;

  try {
    const profile = await getProvider().getProfile(playerId, season);
    return NextResponse.json({ profile });
  } catch (e) {
    const err = e instanceof ApiError ? e : new ApiError("Couldn't load that player. Try again.", 500);
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
}
