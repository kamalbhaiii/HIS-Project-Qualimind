import { Router } from 'express';
import { getHealth } from '@services/health.service';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/', async (_req, res) => {
  await res.json(await getHealth());
});

export default router;
