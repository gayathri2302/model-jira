import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });
import './config/env.config';
import app from './app';
import { getPool, closePool } from './config/db.config';
import { logger } from './utils/logger.util';
import { env } from './config/env.config';

const PORT = parseInt(env.PORT, 10);

async function start(): Promise<void> {
  await getPool();
  logger.info('Database connection established');

  const server = app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });

  const shutdown = async () => {
    logger.info('Shutting down...');
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
