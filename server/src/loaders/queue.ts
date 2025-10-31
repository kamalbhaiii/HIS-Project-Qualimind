import { Queue } from 'bullmq';
import cfg from '@config/index';
import { redis } from './redis';

export const exampleQueue = new Queue('example', { connection: redis.options as any });
// Add processors later under /jobs
