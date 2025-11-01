import {prisma} from '../loaders/prisma'
import cfg from '@config/index';
import {redis} from '@loaders/redis'

export async function getHealth() {
  const pong = await redis.ping();
  try{
    await prisma.$queryRaw`SELECT 1`;
    return {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: 'ok',
    cache: pong === 'PONG' ? 'ok' : 'error'
    };
  }
  catch {
    return {
      status: "error",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: 'error',
      cache: pong === 'PONG' ? 'ok' : 'error'
    }
  }
}
