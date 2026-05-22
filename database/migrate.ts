import fs from 'fs';
import path from 'path';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

function parseConnectionUrl(url: string): sql.config {
  const withoutScheme = url.replace(/^sqlserver:\/\//, '');
  const [hostPort, ...paramParts] = withoutScheme.split(';');
  const [server, portStr] = hostPort.split(':');
  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const eq = part.indexOf('=');
    if (eq !== -1) params[part.slice(0, eq).toLowerCase()] = part.slice(eq + 1);
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
  };
}

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set in server/.env');
    process.exit(1);
  }

  const pool = await sql.connect(parseConnectionUrl(dbUrl));
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    const upBlock = content.split('-- down')[0].replace('-- up', '').trim();
    console.log(`Running migration: ${file}`);
    await pool.request().query(upBlock);
  }

  console.log('All migrations applied.');
  await pool.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
