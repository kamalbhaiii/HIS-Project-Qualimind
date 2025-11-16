import { Queue } from 'bullmq';
import { redis } from '@loaders/redis';

const connection = redis; // bullmq accepts ioredis instance

export const preprocessQueue = new Queue('preprocess', {
  connection,
});
