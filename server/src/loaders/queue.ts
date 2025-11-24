import { Queue } from 'bullmq';
import { redis } from '@loaders/redis';

const connection = redis;

export const preprocessQueue = new Queue('preprocess', {
  connection,
});
