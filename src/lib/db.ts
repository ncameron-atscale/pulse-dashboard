import { Client, Connection } from "pg";

type PoolConfigKey = string; // host|port|ssl

var client: Client;

function getConnection(): Client {
  if (client != null) 
      return client;

  client =  new Client({
    host: "172.210.83.204",
    port: 15432,
    user: "admin",
    password: process.env.PGPASSWORD,
    database: "Telemetry",
    connectionTimeoutMillis: 1000,
  });

  client.connect();

  return client;
}

export async function query<T = any>(text: string, params?: any[]): Promise<any> {
  const connection = getConnection();
  try {
        // await connection.query('SET statement_timeout TO 8000');
        const res = connection.query(text);
        return res
    } catch (err) {
      console.log(text);
      console.log(err);
      return {rows:[]};
    }
  }
