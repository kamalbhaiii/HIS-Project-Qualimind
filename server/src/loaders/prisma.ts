import {PrismaClient} from '@prisma/client';
import cfg from '@config/index';

// Pass DB URL from JSON directly at runtime (no env file needed)
export const prisma = new PrismaClient({
  datasources: {
    db: { url: cfg.database.url }
  }
});
