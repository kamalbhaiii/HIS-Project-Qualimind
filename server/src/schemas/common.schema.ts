import { z } from 'zod';

// Example schema (unused by /health but ready)
export const pingSchema = z.object({ ping: z.string().default('pong') });
