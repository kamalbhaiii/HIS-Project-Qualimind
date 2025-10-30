import config from 'config';
import { z } from 'zod';

const Schema = z.object({
  app: z.object({
    port: z.number(),
    env: z.string()
  }),
  database: z.object({
    url: z.string().startsWith('postgresql://')
  }),
  redis: z.object({ url: z.string() }),
  rService: z.object({ url: z.string() }),
  rateLimit: z.object({ windowMs: z.number(), max: z.number() }),
  security: z.object({ jwtSecret: z.string().min(10) })
});

export type AppConfig = z.infer<typeof Schema>;

const cfg = Schema.parse({
  app: config.get('app'),
  database: config.get('database'),
  redis: config.get('redis'),
  rService: config.get('rService'),
  rateLimit: config.get('rateLimit'),
  security: config.get('security'),
});

export default cfg;
