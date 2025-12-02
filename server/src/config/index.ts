import config from 'config';
import { g } from 'vitest/dist/chunks/suite.d.BJWk38HB';
import { jwt, z } from 'zod';

const Schema = z.object({
  app: z.object({
    port: z.number(),
    env: z.string(),
    url: z.string()
  }),
  frontend: z.object({ url: z.string() }),
  nodemailer: z.object({
    smtp_user: z.string(),
    smtp_pass: z.string(),
    name_from: z.string(),
    email_from: z.string()
  }),
  database: z.object({
    url: z.string().startsWith('postgresql://')
  }),
  redis: z.object({ url: z.string() }),
  rService: z.object({ url: z.string(), processEndpoint: z.string() }),
  rateLimit: z.object({ windowMs: z.number(), max: z.number() }),
  security: z.object({ jwtSecret: z.string().min(10), jwtExpiresIn: z.string() }),
  googleAuth: z.object({
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
    redirectUri: z.string().min(1)
  }),
  multer: z.object({ dest: z.string().min(1), save: z.string().min(1) })
});

export type AppConfig = z.infer<typeof Schema>;

const cfg = Schema.parse({
  app: config.get('app'),
  database: config.get('database'),
  redis: config.get('redis'),
  rService: config.get('rService'),
  rateLimit: config.get('rateLimit'),
  security: config.get('security'),
  googleAuth: config.get('googleAuth'),
  multer: config.get('multer'),
  frontend: config.get('frontend'),
  nodemailer: config.get('nodemailer')
});

export default cfg;
