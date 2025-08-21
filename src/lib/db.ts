import { Pool } from "pg";

type PoolConfigKey = string; // host|port|ssl

let pool: Pool | null = null;
let lastGoodKey: PoolConfigKey | null = null;

function buildPool(host: string, port: number, useSSL: boolean): Pool {
  return new Pool({
    host,
    port,
    user: process.env.PGUSER || "admin",
    password: process.env.PGPASSWORD || "@Scale800",
    database: process.env.PGDATABASE || "Telemetry",
    ssl: useSSL ? ({ rejectUnauthorized: false } as any) : (false as any),
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true as any,
  });
}

function getCandidates(): Array<{ key: PoolConfigKey; pool: Pool }> {
  const host = process.env.PGHOST || "class-i.training.atscale-se-demo.com";
  const envPort = Number(process.env.PGPORT || 10500);
  const ports = Array.from(new Set([envPort, 15432]));
  const sslOptions = [false, true];
  const list: Array<{ key: PoolConfigKey; pool: Pool }> = [];
  for (const p of ports) {
    for (const ssl of sslOptions) {
      const key: PoolConfigKey = `${host}|${p}|${ssl ? "ssl" : "nossl"}`;
      list.push({ key, pool: buildPool(host, p, ssl) });
    }
  }
  // prefer last known good first
  if (lastGoodKey) {
    list.sort((a, b) => (a.key === lastGoodKey ? -1 : b.key === lastGoodKey ? 1 : 0));
  }
  return list;
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>{
  const candidates = getCandidates();
  let lastError: any = null;
  for (const { key, pool: candidate } of candidates) {
    try {
      const client = await candidate.connect();
      try {
        await client.query('SET statement_timeout TO 8000');
        const res = await client.query<T>(text, params);
        // success: cache this pool
        pool = candidate;
        lastGoodKey = key;
        return { rows: res.rows };
      } finally {
        client.release();
      }
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  // If all candidates failed, throw the last error
  throw lastError || new Error("All database connection attempts failed");
}
