import sql from 'mssql';
import { env } from './env.config';

function parseConnectionUrl(url: string): sql.config {
  // Format: sqlserver://host:port;key=value;key=value
  const withoutScheme = url.replace(/^sqlserver:\/\//, '');
  const [hostPort, ...paramParts] = withoutScheme.split(';');
  const [server, portStr] = hostPort.split(':');

  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const eq = part.indexOf('=');
    if (eq !== -1) {
      params[part.slice(0, eq).toLowerCase()] = part.slice(eq + 1);
    }
  }

  return {
    server,
    port: portStr ? parseInt(portStr, 10) : 1433,
    database: params['database'],
    user: params['user'],
    password: params['password'],
    options: {
      encrypt: params['encrypt'] !== 'false',
      trustServerCertificate: params['trustservercertificate'] === 'true',
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = new sql.ConnectionPool(parseConnectionUrl(env.DATABASE_URL));
    await pool.connect();
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

export { sql };
