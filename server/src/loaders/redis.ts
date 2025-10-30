import { Redis } from 'ioredis';
import { config } from '@config/index';

export const redis = new Redis(config.redisUrl);
