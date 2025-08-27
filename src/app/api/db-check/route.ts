import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  const start = Date.now();
  try {
    const rows  = await query<{ user_id: string }>("select query_hour, max(m_epoch_wall_time_avg) from 'Telemetry' group by query_hour");
    console.log(rows);
    return NextResponse.json({ ok: true, result: rows[0]?.user_id, ms: Date.now() - start });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "DB error", ms: Date.now() - start }, { status: 500 });
  }
}
