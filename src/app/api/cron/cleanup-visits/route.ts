import { NextResponse } from "next/server";
import { autoCloseExpiredVisits } from "@/actions/visit";

/**
 * Cron endpoint: auto-close expired visitor sessions.
 *
 * Intended to be called by Vercel Cron or an external scheduler every 1-5 min.
 *
 * To set up in Vercel, add to vercel.json:
 *   { "crons": [{ "path": "/api/cron/cleanup-visits", "schedule": "every 5 minutes" }] }
 *
 * Optionally protect with CRON_SECRET env var.
 */
export async function GET(request: Request) {
  // Optional: verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { closedCount } = await autoCloseExpiredVisits();

    return NextResponse.json({
      ok: true,
      closedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cleanup-visits cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
