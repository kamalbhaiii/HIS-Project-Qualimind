import { prisma } from '../loaders/prisma';
import cfg from '@config/index';
import { redis } from '@loaders/redis';
import { checkREngineHealth } from '@loaders/rEngine';

export async function getHealth() {
  const pong = await redis.ping();
  const redisStatus = pong === 'PONG' ? 'ok' : 'error';

  // Ask R engine in parallel with DB
  const [dbResult, rEngineStatus] = await Promise.all([
    (async () => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return 'ok';
      } catch (e) {
        return 'error';
      }
    })(),
    checkREngineHealth()
  ]);

  const overallOk = dbResult === 'ok' && redisStatus === 'ok' && rEngineStatus === 'ok';

  return {
    status: overallOk ? `${cfg.app.env} env ok` : `${cfg.app.env} env error`,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbResult,
    redis: redisStatus,
    rEngine: rEngineStatus
  };
}
