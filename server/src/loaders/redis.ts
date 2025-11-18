import { Redis } from 'ioredis';
import cfg from '@config/index';

export const redis = new Redis(cfg.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,  
    offlineQueue: false,
});
