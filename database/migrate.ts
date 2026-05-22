import fs from 'fs';
import path from 'path';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const config: sql.config = {
  server: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT ?? '1433', 10),
  database: process.env.DB_NAME!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== 'false',
  },
};

async function run() {
  const pool = await sql.connect(config);
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
