import {PrismaClient} from '../../prisma/.prisma/client';
import cfg from '@config/index';
process.env.DATABASE_URL = cfg.database.url;
// Pass DB URL from JSON directly at runtime (no env file needed)
export const prisma = new PrismaClient({
  datasources: {
    db: { url: cfg.database.url }
  }
});
