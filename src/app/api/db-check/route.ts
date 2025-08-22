import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  const start = Date.now();
  try {
    const { rows } = await query<{ one: number }>("select m_received_max from Telemetry");
    return NextResponse.json({ ok: true, result: rows[0]?.one, ms: Date.now() - start });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "DB error", ms: Date.now() - start }, { status: 500 });
  }
}
