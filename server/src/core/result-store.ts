import { redis } from '@loaders/redis';

export async function saveProcessedResult(
  processingJobId: string,
  result: unknown
): Promise<string> {
  const key = `processed:${processingJobId}`;
  await redis.set(key, JSON.stringify(result), 'EX', 60 * 60 * 24); // 24h
  return key;
}

export async function getProcessedResult(key: string) {
  const raw = await redis.get(key);
  if (!raw) return null;
  return JSON.parse(raw);
}
