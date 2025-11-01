import {prisma} from '../loaders/prisma'
import cfg from '@config/index';
import {redis} from '@loaders/redis'

export async function getHealth() {
  const pong = await redis.ping();
  try{
    const resp = await prisma.$queryRaw`SELECT 1`;
    return {
    status: `${cfg.app.env} env ok`,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: 'ok',
    cache: pong === 'PONG' ? 'ok' : 'error'
    };
  }
  catch (error) {
    return {
      status: `${cfg.app.env} env error`,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: 'error',
      cache: pong === 'PONG' ? 'ok' : 'error',
      error: `${error}`
    }
  }
}
