import postgres from 'postgres'


const sql = postgres({
  host: "172.210.83.204",
  port: 10520,
  user: "atscale",
  password: process.env.PGPASSWORD,
  database: "Telemetry",
});

// const sql = postgres({
//   host: "172.210.83.204",
//   port: 15432,
//   user: "admin",
//   password: process.env.PGPASSWORD,
//   database: "Telemetry",
// });

export async function query<T = any>(text: string, params?: any[]): Promise<any> {
  try {
    console.log(process.env.PGPASSWORD);
    // await connection.query('SET statement_timeout TO 8000');
    console.log(text);
    const res = await sql`select m_epoch_wall_time_avg from Telemetry`;
    console.log(res);
    return res
  } catch (err) {
    console.log(text);
    console.log(err);
    return { rows: [] };
  }
}
