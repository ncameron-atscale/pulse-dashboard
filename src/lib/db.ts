import { Pool } from "pg";

let pool: Pool | null = null;

function createPool(useSSL: boolean): Pool {
  console.log(process.env);
  return new Pool({
    host: "class-i.training.atscale-se-demo.com",
    port: 15432,
    user: "admin",
    password: "@Scale800",
    database: "Telemetry",
    ssl: useSSL ? { rejectUnauthorized: false } : (false as any),
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 3000,
  });
}

pool = createPool(false);

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>{
  if (!pool) pool = createPool(false);
  try {
    const client = await pool.connect();
    try {
      // ensure very fast statement timeout per session (3s)
      await client.query('SET statement_timeout TO 3000');
      const res = await client.query<T>(text, params);
      return { rows: res.rows };
    } finally {
      client.release();
    }
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg.includes("does not support SSL") || msg.includes("SSL")) {
      // Recreate pool without SSL and retry once
      pool = createPool(false);
      const client = await pool.connect();
      try {
        await client.query('SET statement_timeout TO 3000');
        const res = await client.query<T>(text, params);
        return { rows: res.rows };
      } finally {
        client.release();
      }
    }
    throw err;
  }
}
